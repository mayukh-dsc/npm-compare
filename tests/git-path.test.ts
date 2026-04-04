import { describe, it, expect } from 'vitest';
import { isSafeGitShowPath } from '../src/git-path.js';

describe('isSafeGitShowPath', () => {
  it('allows normal snapshot paths', () => {
    expect(isSafeGitShowPath('.npm-compare-snapshot.json')).toBe(true);
    expect(isSafeGitShowPath('reports/snapshot.json')).toBe(true);
  });

  it('rejects path traversal', () => {
    expect(isSafeGitShowPath('../foo.json')).toBe(false);
    expect(isSafeGitShowPath('foo/../../etc/passwd')).toBe(false);
  });

  it('rejects absolute paths', () => {
    expect(isSafeGitShowPath('/etc/passwd')).toBe(false);
  });

  it('rejects empty and control characters', () => {
    expect(isSafeGitShowPath('')).toBe(false);
    expect(isSafeGitShowPath('foo\nbar')).toBe(false);
    expect(isSafeGitShowPath('foo\0bar')).toBe(false);
  });
});
