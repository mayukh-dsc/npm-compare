import { describe, it, expect } from 'vitest';
import { diffGraphs } from '../../src/graph/diff.js';
import type { LockfileGraph, LockfileNode } from '../../src/graph/types.js';

function node(
  id: string,
  name: string,
  version: string,
  parentId: string | null,
  extra?: Partial<LockfileNode>,
): LockfileNode {
  return {
    id,
    name,
    version,
    integrity: '',
    resolved: '',
    dev: false,
    optional: false,
    parentId,
    ...extra,
  };
}

function graph(nodes: LockfileNode[], kind: 'npm' | 'pnpm' = 'npm'): LockfileGraph {
  const m = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes: m,
    importerIds: [],
    lockfileVersion: 3,
    projectName: 't',
    projectVersion: '1.0.0',
    kind,
  };
}

describe('diffGraphs', () => {
  it('returns empty when previous is null', () => {
    const cur = graph([node('node_modules/foo', 'foo', '1.0.0', null)]);
    const d = diffGraphs(null, cur);
    expect(d.introduced).toHaveLength(0);
    expect(d.removed).toHaveLength(0);
  });

  it('detects introduced nodes by id', () => {
    const prev = graph([node('node_modules/a', 'a', '1.0.0', null)]);
    const cur = graph([
      node('node_modules/a', 'a', '1.0.0', null),
      node('node_modules/b', 'b', '1.0.0', null),
    ]);
    const d = diffGraphs(prev, cur);
    expect(d.introduced).toHaveLength(1);
    expect(d.introduced[0]?.child.name).toBe('b');
    expect(d.introduced[0]?.introducerKind).toBe('root');
  });

  it('attributes logical npm introducer when hoisted (semver edge)', () => {
    const parent = node('node_modules/what-new-pkg', 'what-new-pkg', '0.1.0', null);
    const child = node('node_modules/commander', 'commander', '12.1.0', null, {
      logicalParentIds: ['node_modules/what-new-pkg'],
    });
    const prev = graph([parent]);
    const cur = graph([parent, child]);
    const d = diffGraphs(prev, cur);
    expect(d.introduced).toHaveLength(1);
    expect(d.introduced[0]?.introducerKind).toBe('parent');
    expect(d.introduced[0]?.introducer?.name).toBe('what-new-pkg');
  });

  it('attributes parent introducer', () => {
    const prev = graph([node('node_modules/p', 'p', '1.0.0', null)]);
    const cur = graph([
      node('node_modules/p', 'p', '1.0.0', null),
      node('node_modules/p/node_modules/c', 'c', '2.0.0', 'node_modules/p'),
    ]);
    const d = diffGraphs(prev, cur);
    expect(d.introduced).toHaveLength(1);
    expect(d.introduced[0]?.introducerKind).toBe('parent');
    expect(d.introduced[0]?.introducer?.name).toBe('p');
  });

  it('detects removed nodes', () => {
    const prev = graph([
      node('node_modules/a', 'a', '1.0.0', null),
      node('node_modules/b', 'b', '1.0.0', null),
    ]);
    const cur = graph([node('node_modules/a', 'a', '1.0.0', null)]);
    const d = diffGraphs(prev, cur);
    expect(d.removed).toHaveLength(1);
    expect(d.removed[0]?.name).toBe('b');
  });

  it('skips importer synthetic nodes in introduced list', () => {
    const imp: LockfileNode = {
      id: 'importer:.',
      name: '(workspace)',
      version: '',
      integrity: '',
      resolved: '',
      dev: false,
      optional: false,
      parentId: null,
      isImporter: true,
    };
    const pkg = node('foo@1.0.0', 'foo', '1.0.0', 'importer:.');
    const prev = graph([imp], 'pnpm');
    const cur = graph([imp, pkg], 'pnpm');
    const d = diffGraphs(prev, cur);
    expect(d.introduced).toHaveLength(1);
    expect(d.introduced[0]?.child.name).toBe('foo');
  });

  it('uses multi introducer when multiple parents exist', () => {
    const pa = node('a@1', 'a', '1.0.0', null);
    const pb = node('b@1', 'b', '1.0.0', null);
    const child = node('c@1', 'c', '1.0.0', 'a@1', {
      additionalParentIds: ['b@1'],
    });
    const prev = graph([pa, pb]);
    const cur = graph([pa, pb, child]);
    const d = diffGraphs(prev, cur);
    expect(d.introduced).toHaveLength(1);
    expect(d.introduced[0]?.introducerKind).toBe('multi');
    expect(
      d.introduced[0]?.introducers
        ?.map((n) => n.id)
        .sort((a, b) => a.localeCompare(b)),
    ).toEqual(['a@1', 'b@1']);
    expect(d.introduced[0]?.introducers).toBeDefined();
  });

  it('treats missing parent node as root introducer', () => {
    const child = node('node_modules/orphan', 'orphan', '1.0.0', 'node_modules/missing');
    const prev = graph([]);
    const cur = graph([child]);
    const d = diffGraphs(prev, cur);
    expect(d.introduced).toHaveLength(1);
    expect(d.introduced[0]?.introducerKind).toBe('root');
  });

  it('deduplicates additional parents that match the primary parent id', () => {
    const p = node('p@1', 'p', '1.0.0', null);
    const child = node('c@1', 'c', '1.0.0', 'p@1', { additionalParentIds: ['p@1'] });
    const prev = graph([p]);
    const cur = graph([p, child]);
    const d = diffGraphs(prev, cur);
    expect(d.introduced).toHaveLength(1);
    expect(d.introduced[0]?.introducerKind).toBe('parent');
  });
});
