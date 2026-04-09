import { execFileSync } from 'node:child_process';
import { isSafeGitShowPath } from '../git-path.js';

/**
 * Node's default `execFileSync` stdout limit is 1 MiB; monorepo lockfiles are often much larger.
 * Without this, `git show` fails with `ENOBUFS` and the baseline is treated as missing.
 */
export const GIT_SHOW_MAX_BUFFER_BYTES = 64 * 1024 * 1024;

/** Git `HEAD:<path>` always uses `/`; normalize `\` so Windows-style paths in config work on POSIX. */
function toGitPath(snapshotFile: string): string {
  return snapshotFile.replace(/\\/g, '/');
}

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
 * Reads a repository file as it existed in the last git commit (HEAD).
 * Returns null if not a git repo, the file has never been committed, or the path is unsafe.
 */
export function getGitFileFromHead(relativePath: string, projectRoot: string): string | null {
  if (!isSafeGitShowPath(relativePath)) {
    return null;
  }
  const gitPath = toGitPath(relativePath);
  try {
    const output = execFileSync('git', ['show', `HEAD:${gitPath}`], {
      cwd: projectRoot,
      encoding: 'utf8',
      maxBuffer: GIT_SHOW_MAX_BUFFER_BYTES,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output;
  } catch {
    return null;
  }
}

/** Raw text of the lockfile at `HEAD` (alias for {@link getGitFileFromHead}). */
export function getGitLockfile(
  lockfileRelativePath: string,
  projectRoot: string,
): string | null {
  return getGitFileFromHead(lockfileRelativePath, projectRoot);
}
