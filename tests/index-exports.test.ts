import { describe, it, expect } from 'vitest';
import * as api from '../src/index.js';

describe('public API (index.ts)', () => {
  it('exports core functions', () => {
    expect(api.parseLockfileToGraph).toBeTypeOf('function');
    expect(api.parseLockfileContentToGraph).toBeTypeOf('function');
    expect(api.resolveDefaultLockfile).toBeTypeOf('function');
    expect(api.parseNpmLockfileToGraph).toBeTypeOf('function');
    expect(api.parsePnpmLockfileToGraph).toBeTypeOf('function');
    expect(api.diffGraphs).toBeTypeOf('function');
    expect(api.collectIntroducers).toBeTypeOf('function');
    expect(api.loadConfig).toBeTypeOf('function');
    expect(api.mergeCliFlags).toBeTypeOf('function');
    expect(api.isGitRepository).toBeTypeOf('function');
    expect(api.getGitLockfile).toBeTypeOf('function');
    expect(api.getGitFileFromHead).toBeTypeOf('function');
    expect(api.generateIntroReportHtml).toBeTypeOf('function');
    expect(api.buildDependencyTrees).toBeTypeOf('function');
    expect(api.getParentLockfilePath).toBeTypeOf('function');
  });
});
