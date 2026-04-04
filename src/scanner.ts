import fs from 'node:fs';
import type { PackageEntry, Snapshot } from './types.js';

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
  name?: string;
  version?: string;
  lockfileVersion: number;
  dependencies?: Record<string, LockfileV1Dependency>;
  packages?: Record<string, LockfileV2Package>;
}

function flattenV1Dependencies(
  deps: Record<string, LockfileV1Dependency>,
): PackageEntry[] {
  const entries: PackageEntry[] = [];
  for (const [name, dep] of Object.entries(deps)) {
    entries.push({
      name,
      version: dep.version,
      integrity: dep.integrity ?? '',
      resolved: dep.resolved ?? '',
      dev: dep.dev ?? false,
      optional: dep.optional ?? false,
    });
    if (dep.dependencies) {
      entries.push(...flattenV1Dependencies(dep.dependencies));
    }
  }
  return entries;
}

export interface ParsedLockfile {
  packages: PackageEntry[];
  lockfileVersion: number;
  projectName: string;
  projectVersion: string;
}

export function parseLockfile(lockfilePath: string): ParsedLockfile {
  if (!fs.existsSync(lockfilePath)) {
    throw new Error(`Lock file not found: ${lockfilePath}`);
  }

  const content = fs.readFileSync(lockfilePath, 'utf8');
  let lockfile: Lockfile;
  try {
    lockfile = JSON.parse(content) as Lockfile;
  } catch {
    throw new Error(`Failed to parse lock file as JSON: ${lockfilePath}`);
  }

  const lockfileVersion = lockfile.lockfileVersion ?? 1;
  const projectName = lockfile.name ?? 'unknown';
  const projectVersion = lockfile.version ?? '0.0.0';

  let packages: PackageEntry[];

  if (lockfileVersion >= 2 && lockfile.packages) {
    packages = Object.entries(lockfile.packages)
      .filter(([key, pkg]) => key.startsWith('node_modules/') && !pkg.link)
      .map(([key, pkg]) => {
        const parts = key.split('node_modules/');
        const name = parts[parts.length - 1] ?? key;
        return {
          name,
          version: pkg.version ?? '',
          integrity: pkg.integrity ?? '',
          resolved: pkg.resolved ?? '',
          dev: pkg.dev ?? false,
          optional: pkg.optional ?? false,
        };
      });
  } else if (lockfile.dependencies) {
    packages = flattenV1Dependencies(lockfile.dependencies);
  } else {
    packages = [];
  }

  packages.sort((a, b) => a.name.localeCompare(b.name));

  return { packages, lockfileVersion, projectName, projectVersion };
}

export function buildSnapshot(lockfilePath: string): Snapshot {
  const { packages, lockfileVersion, projectName, projectVersion } =
    parseLockfile(lockfilePath);

  return {
    generatedAt: new Date().toISOString(),
    projectName,
    projectVersion,
    nodeVersion: process.version,
    lockfileVersion,
    packages,
  };
}
