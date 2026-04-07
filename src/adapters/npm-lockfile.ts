import fs from 'node:fs';
import { getParentLockfilePath } from '../dependency-tree.js';
import type { LockfileGraph, LockfileNode } from '../graph/types.js';
import {
  createNpmLockfileRootNode,
  wireNpmLogicalDependencies,
} from './npm-logical-deps.js';

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
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface NpmLockfileJson {
  name?: string;
  version?: string;
  lockfileVersion: number;
  dependencies?: Record<string, LockfileV1Dependency>;
  packages?: Record<string, LockfileV2Package>;
}

function parseNameFromPathKey(key: string): string {
  const parts = key.split('node_modules/');
  return parts[parts.length - 1] ?? key;
}

function buildV1Nodes(
  deps: Record<string, LockfileV1Dependency>,
  pathPrefix: string,
  nodes: Map<string, LockfileNode>,
): void {
  for (const [name, dep] of Object.entries(deps)) {
    const pathKey =
      pathPrefix === '' ? `node_modules/${name}` : `${pathPrefix}/node_modules/${name}`;
    const parentId = pathPrefix === '' ? null : pathPrefix;
    const node: LockfileNode = {
      id: pathKey,
      name,
      version: dep.version,
      integrity: dep.integrity ?? '',
      resolved: dep.resolved ?? '',
      dev: dep.dev ?? false,
      optional: dep.optional ?? false,
      parentId,
    };
    nodes.set(pathKey, node);
    if (dep.dependencies) {
      buildV1Nodes(dep.dependencies, pathKey, nodes);
    }
  }
}

function buildV2Nodes(packages: Record<string, LockfileV2Package>, nodes: Map<string, LockfileNode>): void {
  for (const [key, pkg] of Object.entries(packages)) {
    if (pkg.link) continue;
    if (key !== '' && !key.startsWith('node_modules/')) continue;
    if (key === '') continue;

    const name = parseNameFromPathKey(key);
    const pk = getParentLockfilePath(key);
    const parentId = pk === null || pk === '' ? null : pk;

    const node: LockfileNode = {
      id: key,
      name,
      version: pkg.version ?? '',
      integrity: pkg.integrity ?? '',
      resolved: pkg.resolved ?? '',
      dev: pkg.dev ?? false,
      optional: pkg.optional ?? false,
      parentId,
    };
    nodes.set(key, node);
  }
}

export function npmLockfileJsonToGraph(lockfile: NpmLockfileJson): LockfileGraph {
  const lockfileVersion = lockfile.lockfileVersion ?? 1;
  const projectName = lockfile.name ?? 'unknown';
  const projectVersion = lockfile.version ?? '0.0.0';

  const nodes = new Map<string, LockfileNode>();

  if (lockfileVersion >= 2 && lockfile.packages) {
    buildV2Nodes(lockfile.packages, nodes);
    const npmRoot = createNpmLockfileRootNode();
    nodes.set(npmRoot.id, npmRoot);
    wireNpmLogicalDependencies(lockfile.packages, nodes);
  } else if (lockfile.dependencies) {
    buildV1Nodes(lockfile.dependencies, '', nodes);
  }

  return {
    nodes,
    importerIds: [],
    lockfileVersion,
    projectName,
    projectVersion,
    kind: 'npm',
  };
}

export function parseNpmLockfileToGraph(lockfilePath: string): LockfileGraph {
  if (!fs.existsSync(lockfilePath)) {
    throw new Error(`Lock file not found: ${lockfilePath}`);
  }

  const content = fs.readFileSync(lockfilePath, 'utf8');
  let lockfile: NpmLockfileJson;
  try {
    lockfile = JSON.parse(content) as NpmLockfileJson;
  } catch {
    throw new Error(`Failed to parse lock file as JSON: ${lockfilePath}`);
  }

  return npmLockfileJsonToGraph(lockfile);
}

export function parseNpmLockfileContentToGraph(content: string, sourceLabel: string): LockfileGraph {
  let lockfile: NpmLockfileJson;
  try {
    lockfile = JSON.parse(content) as NpmLockfileJson;
  } catch {
    throw new Error(`Failed to parse lock file as JSON: ${sourceLabel}`);
  }
  return npmLockfileJsonToGraph(lockfile);
}
