import { describe, it, expect } from 'vitest';
import {
  NPM_LOCKFILE_ROOT_ID,
  createNpmLockfileRootNode,
  wireNpmLogicalDependencies,
} from '../../src/adapters/npm-logical-deps.js';
import type { LockfileNode } from '../../src/graph/types.js';

function pkg(partial: Partial<LockfileNode> & Pick<LockfileNode, 'id' | 'name' | 'version'>): LockfileNode {
  return {
    integrity: '',
    resolved: '',
    dev: false,
    optional: false,
    parentId: null,
    ...partial,
  };
}

describe('wireNpmLogicalDependencies', () => {
  it('links hoisted child to declaring parent via semver', () => {
    const parent = pkg({
      id: 'node_modules/what-new-pkg',
      name: 'what-new-pkg',
      version: '0.1.0',
    });
    const commander = pkg({
      id: 'node_modules/commander',
      name: 'commander',
      version: '12.1.0',
    });
    const nodes = new Map<string, LockfileNode>([
      [parent.id, parent],
      [commander.id, commander],
      [NPM_LOCKFILE_ROOT_ID, createNpmLockfileRootNode()],
    ]);

    const packages = {
      '': { name: 'app', version: '1.0.0', dependencies: { 'what-new-pkg': '^0.1.0' } },
      'node_modules/what-new-pkg': {
        version: '0.1.0',
        dependencies: { commander: '^12.0.0' },
      },
      'node_modules/commander': { version: '12.1.0' },
    };

    wireNpmLogicalDependencies(packages, nodes);

    expect(commander.logicalParentIds).toContain('node_modules/what-new-pkg');
  });

  it('records root manifest when only the project depends on a hoisted package', () => {
    const yaml = pkg({
      id: 'node_modules/yaml',
      name: 'yaml',
      version: '2.8.3',
    });
    const nodes = new Map<string, LockfileNode>([
      [yaml.id, yaml],
      [NPM_LOCKFILE_ROOT_ID, createNpmLockfileRootNode()],
    ]);

    const packages = {
      '': {
        dependencies: { yaml: '^2.0.0' },
      },
      'node_modules/yaml': { version: '2.8.3' },
    };

    wireNpmLogicalDependencies(packages, nodes);

    expect(yaml.logicalParentIds).toEqual([NPM_LOCKFILE_ROOT_ID]);
  });
});
