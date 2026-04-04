import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from 'node:child_process';
import { isGitRepository, getGitSnapshot } from '../../src/strategies/git.js';
import type { Snapshot } from '../../src/types.js';

const mockExecFileSync = vi.mocked(execFileSync);

const makeSnapshot = (): Snapshot => ({
  generatedAt: '2024-01-01T00:00:00.000Z',
  projectName: 'test',
  projectVersion: '1.0.0',
  nodeVersion: 'v20.0.0',
  lockfileVersion: 2,
  packages: [],
});

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

describe('getGitSnapshot', () => {
  it('returns parsed snapshot when git show succeeds', () => {
    const snapshot = makeSnapshot();
    mockExecFileSync.mockReturnValueOnce(JSON.stringify(snapshot));

    const result = getGitSnapshot('.npm-compare-snapshot.json', '/some/path');
    expect(result).toEqual(snapshot);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'git',
      ['show', 'HEAD:.npm-compare-snapshot.json'],
      expect.objectContaining({ cwd: '/some/path' }),
    );
  });

  it('returns null when git show throws (file not in HEAD)', () => {
    mockExecFileSync.mockImplementationOnce(() => {
      throw new Error('fatal: Path not found in HEAD');
    });
    const result = getGitSnapshot('.npm-compare-snapshot.json', '/some/path');
    expect(result).toBeNull();
  });

  it('returns null when git show output is invalid JSON', () => {
    mockExecFileSync.mockReturnValueOnce('not valid json');
    const result = getGitSnapshot('.npm-compare-snapshot.json', '/some/path');
    expect(result).toBeNull();
  });

  it('returns null for unsafe snapshot paths', () => {
    expect(getGitSnapshot('../evil.json', '/some/path')).toBeNull();
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });
});
