import type { DependencyTreeNode, DependencyTrees, PackageEntry } from './types.js';

interface LockfileV1Dependency {
  version: string;
  integrity?: string;
  resolved?: string;
  dev?: boolean;
  optional?: boolean;
  dependencies?: Record<string, LockfileV1Dependency>;
}

interface LockfileV2Package {
  version?: string;
  integrity?: string;
  resolved?: string;
  dev?: boolean;
  optional?: boolean;
  link?: boolean;
}

interface Lockfile {
  lockfileVersion: number;
  dependencies?: Record<string, LockfileV1Dependency>;
  packages?: Record<string, LockfileV2Package>;
}

/** Parent path for a `packages` key in npm lockfile v2+ (`""` = project root). */
export function getParentLockfilePath(key: string): string | null {
  if (key === '' || key === 'node_modules') return null;
  const slashNm = '/node_modules/';
  const idx = key.lastIndexOf(slashNm);
  if (idx !== -1) {
    return key.slice(0, idx);
  }
  if (key.startsWith('node_modules/')) {
    return '';
  }
  return null;
}

function sortTreeNodes(nodes: DependencyTreeNode[]): void {
  nodes.sort((a, b) => a.entry.name.localeCompare(b.entry.name));
  for (const n of nodes) sortTreeNodes(n.children);
}

function buildV1Tree(
  deps: Record<string, LockfileV1Dependency>,
  pathPrefix: string,
): DependencyTreeNode[] {
  return Object.keys(deps)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const dep = deps[name]!;
      const pathKey =
        pathPrefix === '' ? `node_modules/${name}` : `${pathPrefix}/node_modules/${name}`;
      const entry: PackageEntry = {
        name,
        version: dep.version,
        integrity: dep.integrity ?? '',
        resolved: dep.resolved ?? '',
        dev: dep.dev ?? false,
        optional: dep.optional ?? false,
      };
      const children = dep.dependencies ? buildV1Tree(dep.dependencies, pathKey) : [];
      return { pathKey, entry, children };
    });
}

function buildV1(dependencies: Record<string, LockfileV1Dependency>): DependencyTrees {
  const roots = buildV1Tree(dependencies, '');
  sortTreeNodes(roots);
  return {
    production: roots.filter((r) => !r.entry.dev),
    development: roots.filter((r) => r.entry.dev),
  };
}

function buildV2(packages: Record<string, LockfileV2Package>): DependencyTrees {
  const nodeMap = new Map<string, DependencyTreeNode>();

  for (const [key, pkg] of Object.entries(packages)) {
    if (pkg.link) continue;
    if (key !== '' && !key.startsWith('node_modules/')) continue;
    if (key === '') continue;

    const parts = key.split('node_modules/');
    const name = parts[parts.length - 1] ?? key;
    const entry: PackageEntry = {
      name,
      version: pkg.version ?? '',
      integrity: pkg.integrity ?? '',
      resolved: pkg.resolved ?? '',
      dev: pkg.dev ?? false,
      optional: pkg.optional ?? false,
    };
    nodeMap.set(key, { pathKey: key, entry, children: [] });
  }

  for (const key of nodeMap.keys()) {
    const node = nodeMap.get(key)!;
    const pk = getParentLockfilePath(key);
    if (pk === null || pk === '') continue;
    const parent = nodeMap.get(pk);
    if (parent) parent.children.push(node);
  }

  const roots: DependencyTreeNode[] = [];
  for (const key of nodeMap.keys()) {
    if (getParentLockfilePath(key) === '') {
      roots.push(nodeMap.get(key)!);
    }
  }
  sortTreeNodes(roots);

  return {
    production: roots.filter((r) => !r.entry.dev),
    development: roots.filter((r) => r.entry.dev),
  };
}

export function buildDependencyTrees(lockfile: Lockfile, lockfileVersion: number): DependencyTrees {
  if (lockfileVersion >= 2 && lockfile.packages) {
    return buildV2(lockfile.packages);
  }
  if (lockfile.dependencies) {
    return buildV1(lockfile.dependencies);
  }
  return { production: [], development: [] };
}
