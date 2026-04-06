import { describe, it, expect } from 'vitest';
import { generateIntroReportHtml } from '../../src/reporter/intro-report.js';
import type { GraphDiff } from '../../src/graph/diff.js';
import type { LockfileGraph, LockfileNode } from '../../src/graph/types.js';

function minimalGraph(): LockfileGraph {
  const n: LockfileNode = {
    id: 'node_modules/x',
    name: 'x',
    version: '1.0.0',
    integrity: '',
    resolved: '',
    dev: false,
    optional: false,
    parentId: null,
  };
  return {
    nodes: new Map([['node_modules/x', n]]),
    importerIds: [],
    lockfileVersion: 3,
    projectName: 'proj',
    projectVersion: '1.0.0',
    kind: 'npm',
  };
}

function mkNode(partial: Partial<LockfileNode> & Pick<LockfileNode, 'id' | 'name' | 'version'>): LockfileNode {
  return {
    integrity: '',
    resolved: '',
    dev: false,
    optional: false,
    parentId: null,
    ...partial,
  };
}

describe('generateIntroReportHtml', () => {
  it('includes project name and intro section', () => {
    const graph = minimalGraph();
    const diff: GraphDiff = {
      introduced: [],
      removed: [],
    };
    const html = generateIntroReportHtml('proj', 'package-lock.json', graph, diff, {
      generatedAt: '2024-06-01T12:00:00.000Z',
      hasGitBaseline: false,
      baselineReason: 'test skip',
    });
    expect(html).toContain('npm-compare');
    expect(html).toContain('proj');
    expect(html).toContain('test skip');
  });

  it('warns when there is no git baseline and no custom reason', () => {
    const html = generateIntroReportHtml('p', 'l', minimalGraph(), { introduced: [], removed: [] }, {
      generatedAt: '2024-06-01T12:00:00.000Z',
      hasGitBaseline: false,
      baselineReason: null,
    });
    expect(html).toContain('No git baseline');
  });

  it('shows success when baseline exists and nothing was introduced', () => {
    const html = generateIntroReportHtml('p', 'l', minimalGraph(), { introduced: [], removed: [] }, {
      generatedAt: '2024-06-01T12:00:00.000Z',
      hasGitBaseline: true,
      baselineReason: null,
    });
    expect(html).toContain('No newly introduced packages');
  });

  it('renders introduced rows with parent, multi, and root introducers', () => {
    const parentNode: LockfileNode = mkNode({
      id: 'node_modules/parent',
      name: 'parent',
      version: '2.0.0',
      parentId: null,
    });
    const multiA: LockfileNode = mkNode({
      id: 'a@1',
      name: 'a',
      version: '1.0.0',
      parentId: null,
    });
    const multiB: LockfileNode = mkNode({
      id: 'b@1',
      name: 'b',
      version: '1.0.0',
      parentId: null,
    });
    const childParent: LockfileNode = mkNode({
      id: 'node_modules/c1',
      name: 'c1',
      version: '1.0.0',
      parentId: 'node_modules/parent',
    });
    const childMulti: LockfileNode = mkNode({
      id: 'node_modules/c2',
      name: 'c2',
      version: '1.0.0',
      parentId: 'a@1',
      additionalParentIds: ['b@1'],
    });
    const childRoot: LockfileNode = mkNode({
      id: 'node_modules/c3',
      name: 'c3',
      version: '1.0.0',
      parentId: null,
    });
    const graph: LockfileGraph = {
      nodes: new Map(
        [parentNode, multiA, multiB, childParent, childMulti, childRoot].map((n) => [n.id, n]),
      ),
      importerIds: [],
      lockfileVersion: 3,
      projectName: 'proj',
      projectVersion: '1.0.0',
      kind: 'npm',
    };
    const diff: GraphDiff = {
      introduced: [
        {
          child: childParent,
          introducer: parentNode,
          introducerKind: 'parent',
        },
        {
          child: childMulti,
          introducer: multiA,
          introducerKind: 'multi',
          introducers: [multiA, multiB],
        },
        {
          child: childRoot,
          introducer: null,
          introducerKind: 'root',
        },
      ],
      removed: [],
    };
    const html = generateIntroReportHtml('proj', 'package-lock.json', graph, diff, {
      generatedAt: '2024-06-01T12:00:00.000Z',
      hasGitBaseline: true,
      baselineReason: null,
    });
    expect(html).toContain('parent@2.0.0 introduced');
    expect(html).toContain('multiple dependents');
    expect(html).toContain('a@1.0.0, b@1.0.0');
    expect(html).toContain('Workspace root');
  });
});
