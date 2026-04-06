import { describe, it, expect } from 'vitest';
import { isGitRepository, getGitLockfile, getGitFileFromHead } from '../src/strategies/index.js';

describe('strategies/index', () => {
  it('re-exports git helpers', () => {
    expect(isGitRepository).toBeTypeOf('function');
    expect(getGitLockfile).toBeTypeOf('function');
    expect(getGitFileFromHead).toBeTypeOf('function');
  });
});
