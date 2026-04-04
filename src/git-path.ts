import path from 'node:path';

/**
 * Validates a path for use with `git show HEAD:<path>` (repository-relative, no traversal).
 * Rejects absolute paths, `..` segments, and control characters.
 */
export function isSafeGitShowPath(relativePath: string): boolean {
  if (relativePath.length === 0 || relativePath.length > 4096) return false;
  if (path.isAbsolute(relativePath)) return false;
  for (const segment of relativePath.split(/[/\\]/)) {
    if (segment === '..') return false;
  }
  if (/[\0\r\n]/.test(relativePath)) return false;
  return true;
}
