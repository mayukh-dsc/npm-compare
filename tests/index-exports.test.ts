import { describe, it, expect } from 'vitest';
import * as api from '../src/index.js';

describe('public API (index.ts)', () => {
  it('exports core functions', () => {
    expect(api.parseLockfile).toBeTypeOf('function');
    expect(api.buildSnapshot).toBeTypeOf('function');
    expect(api.dedupeLockfilePackages).toBeTypeOf('function');
    expect(api.readSnapshot).toBeTypeOf('function');
    expect(api.writeSnapshot).toBeTypeOf('function');
    expect(api.diffPackages).toBeTypeOf('function');
    expect(api.hasCriticalChanges).toBeTypeOf('function');
    expect(api.loadConfig).toBeTypeOf('function');
    expect(api.mergeCliFlags).toBeTypeOf('function');
    expect(api.isGitRepository).toBeTypeOf('function');
    expect(api.getGitSnapshot).toBeTypeOf('function');
    expect(api.auditRegistry).toBeTypeOf('function');
    expect(api.generateInstalledHtml).toBeTypeOf('function');
    expect(api.generateGitDiffHtml).toBeTypeOf('function');
    expect(api.generateRegistryAuditHtml).toBeTypeOf('function');
    expect(api.buildDependencyTrees).toBeTypeOf('function');
    expect(api.getParentLockfilePath).toBeTypeOf('function');
  });
});
