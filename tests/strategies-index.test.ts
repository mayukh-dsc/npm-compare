import { describe, it, expect } from 'vitest';
import {
  isGitRepository,
  getGitSnapshot,
  auditRegistry,
} from '../src/strategies/index.js';

describe('strategies/index', () => {
  it('re-exports git and registry strategies', () => {
    expect(isGitRepository).toBeTypeOf('function');
    expect(getGitSnapshot).toBeTypeOf('function');
    expect(auditRegistry).toBeTypeOf('function');
  });
});
