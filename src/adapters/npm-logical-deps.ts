import semver from 'semver';
import type { LockfileNode } from '../graph/types.js';

/** Synthetic node id: logical dependents of the root `package.json` / lockfile `""` entry. */
export const NPM_LOCKFILE_ROOT_ID = 'npm:lockfile:root';

interface PackageEntry {
  version?: string;
  link?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function mergeDepRecords(pkg: PackageEntry): Array<{ name: string; range: string }> {
  const out: Array<{ name: string; range: string }> = [];
  const blocks = [
    pkg.dependencies,
    pkg.devDependencies,
    pkg.optionalDependencies,
    pkg.peerDependencies,
  ];
  for (const block of blocks) {
    if (!block) continue;
    for (const [name, range] of Object.entries(block)) {
      if (typeof range === 'string') out.push({ name, range });
    }
  }
  return out;
}

function buildNameIndex(nodes: Map<string, LockfileNode>): Map<string, LockfileNode[]> {
  const idx = new Map<string, LockfileNode[]>();
  for (const n of nodes.values()) {
    if (n.isImporter || n.isNpmLockfileRoot) continue;
    const list = idx.get(n.name) ?? [];
    list.push(n);
    idx.set(n.name, list);
  }
  return idx;
}

function skipRange(range: string): boolean {
  const t = range.trim();
  return (
    t.startsWith('file:') ||
    t.startsWith('link:') ||
    t.startsWith('workspace:') ||
    t.startsWith('git+') ||
    t.startsWith('http:') ||
    t.startsWith('https:')
  );
}

function resolveMatchingNodes(depName: string, range: string, candidates: LockfileNode[]): LockfileNode[] {
  if (!candidates.length) return [];
  if (skipRange(range)) return [];
  if (!semver.validRange(range, { loose: true })) return [];

  const matches: LockfileNode[] = [];
  for (const c of candidates) {
    if (!semver.valid(c.version)) continue;
    if (semver.satisfies(c.version, range, { includePrerelease: true })) {
      matches.push(c);
    }
  }
  return matches;
}

function pushLogicalParent(child: LockfileNode, parentId: string): void {
  if (!child.logicalParentIds) child.logicalParentIds = [];
  if (!child.logicalParentIds.includes(parentId)) {
    child.logicalParentIds.push(parentId);
  }
}

/**
 * For npm lockfile v2+ `packages`, wire logical parent ids from each entry's dependency
 * declarations to resolved hoisted (or nested) nodes. Enables introducer labels when
 * `parentId` is null at the filesystem root.
 */
export function wireNpmLogicalDependencies(
  packages: Record<string, PackageEntry>,
  nodes: Map<string, LockfileNode>,
): void {
  const nameIndex = buildNameIndex(nodes);

  for (const [key, pkg] of Object.entries(packages)) {
    if (pkg.link) continue;
    if (key !== '' && !key.startsWith('node_modules/')) continue;

    const parentId = key === '' ? NPM_LOCKFILE_ROOT_ID : key;
    if (parentId !== NPM_LOCKFILE_ROOT_ID && !nodes.has(parentId)) continue;

    for (const { name: depName, range } of mergeDepRecords(pkg)) {
      const candidates = nameIndex.get(depName);
      if (!candidates?.length) continue;
      for (const child of resolveMatchingNodes(depName, range, candidates)) {
        pushLogicalParent(child, parentId);
      }
    }
  }
}

export function createNpmLockfileRootNode(): LockfileNode {
  return {
    id: NPM_LOCKFILE_ROOT_ID,
    name: '(project)',
    version: '',
    integrity: '',
    resolved: '',
    dev: false,
    optional: false,
    parentId: null,
    isNpmLockfileRoot: true,
  };
}
