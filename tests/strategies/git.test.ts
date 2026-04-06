import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from 'node:child_process';
import { isGitRepository, getGitLockfile } from '../../src/strategies/git.js';

const mockExecFileSync = vi.mocked(execFileSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isGitRepository', () => {
  it('returns true when git command succeeds', () => {
    mockExecFileSync.mockReturnValueOnce(Buffer.from('true'));
    expect(isGitRepository('/some/path')).toBe(true);
  });

  it('returns false when git command throws', () => {
    mockExecFileSync.mockImplementationOnce(() => {
      throw new Error('not a git repo');
    });
    expect(isGitRepository('/some/path')).toBe(false);
  });
});

describe('getGitLockfile', () => {
  it('returns raw file text when git show succeeds', () => {
    const body = '{"lockfileVersion":3,"name":"x"}';
    mockExecFileSync.mockReturnValueOnce(body);

    const result = getGitLockfile('package-lock.json', '/some/path');
    expect(result).toBe(body);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'git',
      ['show', 'HEAD:package-lock.json'],
      expect.objectContaining({ cwd: '/some/path' }),
    );
  });

  it('normalizes backslashes to forward slashes for git show', () => {
    mockExecFileSync.mockReturnValueOnce('{}');

    getGitLockfile('reports\\.npm\\package-lock.json', '/some/path');

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'git',
      ['show', 'HEAD:reports/.npm/package-lock.json'],
      expect.objectContaining({ cwd: '/some/path' }),
    );
  });

  it('returns null when git show throws (file not in HEAD)', () => {
    mockExecFileSync.mockImplementationOnce(() => {
      throw new Error('fatal: Path not found in HEAD');
    });
    const result = getGitLockfile('package-lock.json', '/some/path');
    expect(result).toBeNull();
  });

  it('returns null for unsafe paths', () => {
    expect(getGitLockfile('../evil.json', '/some/path')).toBeNull();
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });
});
