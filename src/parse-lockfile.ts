import fs from 'node:fs';
import path from 'node:path';
import {
  parseNpmLockfileContentToGraph,
  parseNpmLockfileToGraph,
} from './adapters/npm-lockfile.js';
import {
  parsePnpmLockfileContentToGraph,
  parsePnpmLockfileToGraph,
} from './adapters/pnpm-lockfile.js';
import {
  parseYarnLockfileContentToGraph,
  parseYarnLockfileToGraph,
} from './adapters/yarn-lockfile.js';
import type { LockfileGraph } from './graph/types.js';

/**
 * Prefer `pnpm-lock.yaml`, then `yarn.lock`, then `package-lock.json`, under `projectRoot`.
 */
export function resolveDefaultLockfile(projectRoot: string): string {
  const pnpm = path.join(projectRoot, 'pnpm-lock.yaml');
  const yarn = path.join(projectRoot, 'yarn.lock');
  const npm = path.join(projectRoot, 'package-lock.json');
  if (fs.existsSync(pnpm)) return pnpm;
  if (fs.existsSync(yarn)) return yarn;
  if (fs.existsSync(npm)) return npm;
  throw new Error(
    `No lockfile found in ${projectRoot}. Expected pnpm-lock.yaml, yarn.lock, or package-lock.json.`,
  );
}

export function parseLockfileToGraph(lockfilePath: string): LockfileGraph {
  const base = path.basename(lockfilePath).toLowerCase();
  if (
    base === 'pnpm-lock.yaml' ||
    base.endsWith('.yaml') ||
    base.endsWith('.yml')
  ) {
    return parsePnpmLockfileToGraph(lockfilePath);
  }
  if (base === 'yarn.lock') {
    return parseYarnLockfileToGraph(lockfilePath);
  }
  return parseNpmLockfileToGraph(lockfilePath);
}

/** Parse lockfile content from git HEAD (same format detection as path). */
export function parseLockfileContentToGraph(
  content: string,
  lockfileRelativePath: string,
  projectRoot: string,
): LockfileGraph {
  const base = path.basename(lockfileRelativePath).toLowerCase();
  if (
    base === 'pnpm-lock.yaml' ||
    base.endsWith('.yaml') ||
    base.endsWith('.yml')
  ) {
    return parsePnpmLockfileContentToGraph(content, lockfileRelativePath, projectRoot);
  }
  if (base === 'yarn.lock') {
    return parseYarnLockfileContentToGraph(content, lockfileRelativePath, projectRoot);
  }
  return parseNpmLockfileContentToGraph(content, lockfileRelativePath);
}
