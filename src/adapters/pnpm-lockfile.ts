import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { LockfileGraph, LockfileNode } from '../graph/types.js';

interface PnpmDepEntry {
  specifier: string;
  version: string;
}

interface PnpmImporter {
  dependencies?: Record<string, PnpmDepEntry>;
  devDependencies?: Record<string, PnpmDepEntry>;
  optionalDependencies?: Record<string, PnpmDepEntry>;
}

interface PnpmPackageMeta {
  resolution?: { integrity?: string; tarball?: string };
  dev?: boolean;
  optional?: boolean;
}

interface PnpmSnapshot {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface PnpmLockfileYaml {
  lockfileVersion: string;
  importers?: Record<string, PnpmImporter>;
  packages?: Record<string, PnpmPackageMeta>;
  snapshots?: Record<string, PnpmSnapshot>;
}

function readPackageJsonNameVersion(projectDir: string): { projectName: string; projectVersion: string } {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return { projectName: 'unknown', projectVersion: '0.0.0' };
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      name?: string;
      version?: string;
    };
    return {
      projectName: typeof pkg.name === 'string' ? pkg.name : 'unknown',
      projectVersion: typeof pkg.version === 'string' ? pkg.version : '0.0.0',
    };
  } catch {
    return { projectName: 'unknown', projectVersion: '0.0.0' };
  }
}

/** Build pnpm package id: `lodash@4.17.21` or `@scope/pkg@1.0.0`. */
export function pnpmPackageId(depName: string, version: string): string {
  return `${depName}@${version}`;
}

/** Package id is `name@version`; scoped names use the last `@` as the version separator. */
function parseNameVersionFromId(id: string): { name: string; version: string } {
  const lastAt = id.lastIndexOf('@');
  if (lastAt <= 0) {
    return { name: id, version: '' };
  }
  return { name: id.slice(0, lastAt), version: id.slice(lastAt + 1) };
}

function setParent(
  nodes: Map<string, LockfileNode>,
  childId: string,
  parentId: string,
): void {
  const child = nodes.get(childId);
  if (!child) return;
  if (!child.parentId) {
    child.parentId = parentId;
    return;
  }
  if (child.parentId === parentId) return;
  if (!child.additionalParentIds) {
    child.additionalParentIds = [];
  }
  if (!child.additionalParentIds.includes(parentId) && child.parentId !== parentId) {
    child.additionalParentIds.push(parentId);
  }
}

function wireImporterDeps(
  nodes: Map<string, LockfileNode>,
  importerId: string,
  deps: Record<string, PnpmDepEntry> | undefined,
  dev: boolean,
): void {
  if (!deps) return;
  for (const [depName, entry] of Object.entries(deps)) {
    const childId = pnpmPackageId(depName, entry.version);
    setParent(nodes, childId, importerId);
    const node = nodes.get(childId);
    if (node && dev) {
      node.dev = true;
    }
  }
}

function wireSnapshotDeps(
  nodes: Map<string, LockfileNode>,
  parentId: string,
  deps: Record<string, string> | undefined,
): void {
  if (!deps) return;
  for (const [depName, ver] of Object.entries(deps)) {
    const childId = pnpmPackageId(depName, ver);
    setParent(nodes, childId, parentId);
  }
}

export function pnpmLockfileYamlToGraph(
  doc: PnpmLockfileYaml,
  projectName: string,
  projectVersion: string,
): LockfileGraph {
  const nodes = new Map<string, LockfileNode>();
  const importerIds: string[] = [];

  if (doc.importers) {
    for (const rel of Object.keys(doc.importers)) {
      const importerId = `importer:${rel}`;
      importerIds.push(importerId);
      nodes.set(importerId, {
        id: importerId,
        name: rel === '.' ? '(workspace)' : rel,
        version: '',
        integrity: '',
        resolved: '',
        dev: false,
        optional: false,
        parentId: null,
        isImporter: true,
      });
    }
  }

  if (doc.packages) {
    for (const [pkgId, meta] of Object.entries(doc.packages)) {
      const { name, version } = parseNameVersionFromId(pkgId);
      const integrity =
        typeof meta.resolution?.integrity === 'string' ? meta.resolution.integrity : '';
      const resolved =
        typeof meta.resolution?.tarball === 'string' ? meta.resolution.tarball : '';
      nodes.set(pkgId, {
        id: pkgId,
        name,
        version,
        integrity,
        resolved,
        dev: meta.dev ?? false,
        optional: meta.optional ?? false,
        parentId: null,
      });
    }
  }

  if (doc.importers) {
    for (const [rel, imp] of Object.entries(doc.importers)) {
      const importerId = `importer:${rel}`;
      wireImporterDeps(nodes, importerId, imp.dependencies, false);
      wireImporterDeps(nodes, importerId, imp.devDependencies, true);
      wireImporterDeps(nodes, importerId, imp.optionalDependencies, false);
    }
  }

  if (doc.snapshots) {
    for (const [snapId, snap] of Object.entries(doc.snapshots)) {
      wireSnapshotDeps(nodes, snapId, snap.dependencies);
      wireSnapshotDeps(nodes, snapId, snap.optionalDependencies);
    }
  }

  return {
    nodes,
    importerIds,
    lockfileVersion: doc.lockfileVersion ?? 'unknown',
    projectName,
    projectVersion,
    kind: 'pnpm',
  };
}

export function parsePnpmLockfileToGraph(lockfilePath: string): LockfileGraph {
  if (!fs.existsSync(lockfilePath)) {
    throw new Error(`Lock file not found: ${lockfilePath}`);
  }

  const content = fs.readFileSync(lockfilePath, 'utf8');
  let doc: PnpmLockfileYaml;
  try {
    doc = YAML.parse(content) as PnpmLockfileYaml;
  } catch {
    throw new Error(`Failed to parse YAML lock file: ${lockfilePath}`);
  }

  const projectDir = path.dirname(lockfilePath);
  const { projectName, projectVersion } = readPackageJsonNameVersion(projectDir);

  return pnpmLockfileYamlToGraph(doc, projectName, projectVersion);
}

export function parsePnpmLockfileContentToGraph(
  content: string,
  sourceLabel: string,
  projectDir: string,
): LockfileGraph {
  let doc: PnpmLockfileYaml;
  try {
    doc = YAML.parse(content) as PnpmLockfileYaml;
  } catch {
    throw new Error(`Failed to parse YAML lock file: ${sourceLabel}`);
  }
  const { projectName, projectVersion } = readPackageJsonNameVersion(projectDir);
  return pnpmLockfileYamlToGraph(doc, projectName, projectVersion);
}
