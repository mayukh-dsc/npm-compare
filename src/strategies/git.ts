import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { isSafeGitShowPath } from '../git-path.js';
import type { Snapshot } from '../types.js';

export function isGitRepository(projectRoot: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: projectRoot,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the snapshot file as it existed in the last git commit (HEAD).
 * Returns null if not a git repo, the file has never been committed, parsing fails, or the path is unsafe.
 */
export function getGitSnapshot(
  snapshotFile: string,
  projectRoot: string,
): Snapshot | null {
  if (!isSafeGitShowPath(snapshotFile)) {
    return null;
  }
  const gitPath = snapshotFile.split(path.sep).join('/');
  try {
    const output = execFileSync('git', ['show', `HEAD:${gitPath}`], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(output) as Snapshot;
  } catch {
    return null;
  }
}
