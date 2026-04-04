import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import { isGitRepository, getGitSnapshot } from '../../src/strategies/git.js';
import type { Snapshot } from '../../src/types.js';

const mockExecSync = vi.mocked(execSync);

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
    mockExecSync.mockReturnValueOnce(Buffer.from('true'));
    expect(isGitRepository('/some/path')).toBe(true);
  });

  it('returns false when git command throws', () => {
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('not a git repo');
    });
    expect(isGitRepository('/some/path')).toBe(false);
  });
});

describe('getGitSnapshot', () => {
  it('returns parsed snapshot when git show succeeds', () => {
    const snapshot = makeSnapshot();
    mockExecSync.mockReturnValueOnce(JSON.stringify(snapshot) as unknown as Buffer);

    const result = getGitSnapshot('.npm-compare-snapshot.json', '/some/path');
    expect(result).toEqual(snapshot);
  });

  it('returns null when git show throws (file not in HEAD)', () => {
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('fatal: Path not found in HEAD');
    });
    const result = getGitSnapshot('.npm-compare-snapshot.json', '/some/path');
    expect(result).toBeNull();
  });

  it('returns null when git show output is invalid JSON', () => {
    mockExecSync.mockReturnValueOnce('not valid json' as unknown as Buffer);
    const result = getGitSnapshot('.npm-compare-snapshot.json', '/some/path');
    expect(result).toBeNull();
  });
});
