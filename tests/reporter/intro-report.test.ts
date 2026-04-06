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
});
