import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { LockfileGraph, LockfileNode } from '../graph/types.js';

const require = createRequire(import.meta.url);

export interface YarnLockfileParseResult {
  type: string;
  object?: Record<string, YarnLockEntry>;
}

export interface YarnLockEntry {
  version: string;
  resolved?: string;
  integrity?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/** Resolve optional peer @yarnpkg/lockfile (CommonJS). */
export function loadYarnLockfileModule(): {
  parse: (str: string, fileLoc?: string) => YarnLockfileParseResult;
} {
  try {
    return require('@yarnpkg/lockfile') as { parse: (str: string, fileLoc?: string) => YarnLockfileParseResult };
  } catch {
    throw new Error(
      'yarn.lock support requires the optional peer dependency @yarnpkg/lockfile. ' +
        'Install it with: npm install @yarnpkg/lockfile',
    );
  }
}

function readPackageJsonMeta(projectDir: string): {
  projectName: string;
  projectVersion: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
} {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return {
      projectName: 'unknown',
      projectVersion: '0.0.0',
      dependencies: {},
      devDependencies: {},
      optionalDependencies: {},
    };
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      name?: string;
      version?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    return {
      projectName: typeof pkg.name === 'string' ? pkg.name : 'unknown',
      projectVersion: typeof pkg.version === 'string' ? pkg.version : '0.0.0',
      dependencies: pkg.dependencies ?? {},
      devDependencies: pkg.devDependencies ?? {},
      optionalDependencies: pkg.optionalDependencies ?? {},
    };
  } catch {
    return {
      projectName: 'unknown',
      projectVersion: '0.0.0',
      dependencies: {},
      devDependencies: {},
      optionalDependencies: {},
    };
  }
}

/** Name part of a Yarn descriptor key (`pkg@^1.0.0`, `@scope/pkg@^1.0.0`). */
export function yarnDescriptorName(lockfileKey: string): string {
  const lastAt = lockfileKey.lastIndexOf('@');
  if (lastAt <= 0) {
    return lockfileKey;
  }
  return lockfileKey.slice(0, lastAt);
}

export function yarnPackageId(name: string, version: string): string {
  return `${name}@${version}`;
}

function lockfileKeyForDep(depName: string, depRange: string): string {
  return `${depName}@${depRange}`;
}

/** Propagate dev flags along lockfile edges until stable (handles arbitrary key order). */
function relaxDevFlagsAlongEdges(
  nodes: Map<string, LockfileNode>,
  object: Record<string, YarnLockEntry>,
): void {
  let changed = true;
  let guard = 0;
  while (changed && guard < 128) {
    guard++;
    changed = false;
    for (const [key, entry] of Object.entries(object)) {
      const parentId = yarnPackageId(yarnDescriptorName(key), entry.version);
      const parent = nodes.get(parentId);
      if (!parent) continue;

      const relax = (deps?: Record<string, string>) => {
        if (!deps) return;
        for (const [depName, depRange] of Object.entries(deps)) {
          const childKey = lockfileKeyForDep(depName, depRange);
          const childEntry = object[childKey];
          if (!childEntry) continue;
          const childId = yarnPackageId(depName, childEntry.version);
          const child = nodes.get(childId);
          if (!child) continue;
          const before = child.dev;
          mergeDevFlag(child, parent.dev);
          if (child.dev !== before) changed = true;
        }
      };
      relax(entry.dependencies);
      relax(entry.optionalDependencies);
    }
  }
}

function mergeDevFlag(node: LockfileNode, parentDev: boolean): void {
  if (!parentDev) {
    node.dev = false;
  } else if (node.dev !== false) {
    node.dev = true;
  }
}

function mergeOptionalFlag(node: LockfileNode, depOptional: boolean): void {
  if (!depOptional) {
    node.optional = false;
  } else if (node.optional !== false) {
    node.optional = true;
  }
}

function isParentUnset(child: LockfileNode): boolean {
  return (child.parentId as unknown) === '';
}

function setParent(
  nodes: Map<string, LockfileNode>,
  childId: string,
  parentId: string,
  depOptional: boolean,
): void {
  const child = nodes.get(childId);
  if (!child) return;
  mergeOptionalFlag(child, depOptional);
  if (child.parentId === null) {
    child.additionalParentIds ??= [];
    if (!child.additionalParentIds.includes(parentId)) {
      child.additionalParentIds.push(parentId);
    }
    return;
  }
  if (isParentUnset(child)) {
    child.parentId = parentId;
    return;
  }
  if (child.parentId === parentId) return;
  child.additionalParentIds ??= [];
  if (!child.additionalParentIds.includes(parentId) && child.parentId !== parentId) {
    child.additionalParentIds.push(parentId);
  }
}

function wireDirectRoot(
  nodes: Map<string, LockfileNode>,
  childId: string,
  isDevSection: boolean,
  depOptional: boolean,
): void {
  const child = nodes.get(childId);
  if (!child) return;
  child.dev = isDevSection;
  mergeOptionalFlag(child, depOptional);
  const prev = isParentUnset(child) ? null : child.parentId;
  child.parentId = null;
  if (prev) {
    child.additionalParentIds ??= [];
    if (!child.additionalParentIds.includes(prev)) {
      child.additionalParentIds.push(prev);
    }
  }
}

function isYarnBerryLockfile(content: string): boolean {
  return /^\s*__metadata\s*:/m.test(content);
}

function readYarnLockfileVersion(content: string): number {
  const m = /yarn lockfile v(\d+)/.exec(content);
  if (m?.[1]) {
    return Number.parseInt(m[1], 10);
  }
  return 1;
}

export function yarnLockObjectToGraph(
  object: Record<string, YarnLockEntry>,
  projectName: string,
  projectVersion: string,
  pkg: ReturnType<typeof readPackageJsonMeta>,
  lockfileVersion: number,
): LockfileGraph {
  const nodes = new Map<string, LockfileNode>();

  for (const [key, entry] of Object.entries(object)) {
    const name = yarnDescriptorName(key);
    const id = yarnPackageId(name, entry.version);
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        name,
        version: entry.version,
        integrity: entry.integrity ?? '',
        resolved: entry.resolved ?? '',
        dev: false,
        optional: false,
        /** Empty string means "not wired yet"; normalized to null before returning. */
        parentId: '' as unknown as null,
      });
    }
  }

  const wireRootSection = (
    section: Record<string, string>,
    isDevSection: boolean,
    sectionOptional: boolean,
  ): void => {
    for (const [name, range] of Object.entries(section)) {
      const k = lockfileKeyForDep(name, range);
      const entry = object[k];
      if (!entry) {
        continue;
      }
      const childId = yarnPackageId(yarnDescriptorName(k), entry.version);
      wireDirectRoot(nodes, childId, isDevSection, sectionOptional);
    }
  };

  wireRootSection(pkg.dependencies, false, false);
  wireRootSection(pkg.devDependencies, true, false);
  wireRootSection(pkg.optionalDependencies, false, true);

  for (const [key, entry] of Object.entries(object)) {
    const parentName = yarnDescriptorName(key);
    const parentId = yarnPackageId(parentName, entry.version);

    const wireDeps = (
      deps: Record<string, string> | undefined,
      depOptional: boolean,
    ): void => {
      if (!deps) return;
      for (const [depName, depRange] of Object.entries(deps)) {
        const childKey = lockfileKeyForDep(depName, depRange);
        const childEntry = object[childKey];
        if (!childEntry) {
          continue;
        }
        const childId = yarnPackageId(depName, childEntry.version);
        setParent(nodes, childId, parentId, depOptional);
      }
    };

    wireDeps(entry.dependencies, false);
    wireDeps(entry.optionalDependencies, true);
  }

  relaxDevFlagsAlongEdges(nodes, object);

  for (const node of nodes.values()) {
    if (isParentUnset(node)) {
      node.parentId = null;
    }
  }

  return {
    nodes,
    importerIds: [],
    lockfileVersion,
    projectName,
    projectVersion,
    kind: 'yarn',
  };
}

export function parseYarnLockfileContent(
  content: string,
  sourceLabel: string,
  projectDir: string,
): LockfileGraph {
  if (isYarnBerryLockfile(content)) {
    throw new Error(
      `Yarn Berry (v2+) lockfiles are not supported (${sourceLabel}). ` +
        'This tool supports Yarn Classic (v1) yarn.lock only.',
    );
  }

  const { parse } = loadYarnLockfileModule();
  let parsed: YarnLockfileParseResult;
  try {
    parsed = parse(content, sourceLabel);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse yarn.lock (${sourceLabel}): ${msg}`);
  }

  if (parsed.type !== 'success' || !parsed.object) {
    throw new Error(
      `Failed to parse yarn.lock (${sourceLabel}): ${parsed.type}. ` +
        'Resolve merge conflicts and try again.',
    );
  }

  const pkg = readPackageJsonMeta(projectDir);
  const lockfileVersion = readYarnLockfileVersion(content);

  return yarnLockObjectToGraph(parsed.object, pkg.projectName, pkg.projectVersion, pkg, lockfileVersion);
}

export function parseYarnLockfileToGraph(lockfilePath: string): LockfileGraph {
  if (!fs.existsSync(lockfilePath)) {
    throw new Error(`Lock file not found: ${lockfilePath}`);
  }
  const content = fs.readFileSync(lockfilePath, 'utf8');
  const projectDir = path.dirname(lockfilePath);
  return parseYarnLockfileContent(content, lockfilePath, projectDir);
}

export function parseYarnLockfileContentToGraph(
  content: string,
  sourceLabel: string,
  projectRoot: string,
): LockfileGraph {
  return parseYarnLockfileContent(content, sourceLabel, projectRoot);
}
