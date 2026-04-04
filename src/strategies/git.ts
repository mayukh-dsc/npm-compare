import { execSync } from 'node:child_process';
import type { Snapshot } from '../types.js';

export function isGitRepository(projectRoot: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
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
 * Returns null if not a git repo, the file has never been committed, or parsing fails.
 */
export function getGitSnapshot(
  snapshotFile: string,
  projectRoot: string,
): Snapshot | null {
  try {
    const output = execSync(`git show HEAD:${snapshotFile}`, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(output) as Snapshot;
  } catch {
    return null;
  }
}
