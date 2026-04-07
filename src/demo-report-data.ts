import { diffGraphs, type GraphDiff } from './graph/diff.js';
import type { LockfileGraph, LockfileNode } from './graph/types.js';

function mkNode(p: Partial<LockfileNode> & Pick<LockfileNode, 'id' | 'name' | 'version'>): LockfileNode {
  return {
    integrity: 'sha512-demo',
    resolved: 'https://registry.npmjs.org/demo',
    dev: false,
    optional: false,
    parentId: null,
    ...p,
  };
}

function makeGraph(nodes: LockfileNode[]): LockfileGraph {
  return {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    importerIds: [],
    lockfileVersion: 3,
    projectName: 'demo-project',
    projectVersion: '1.0.0',
    kind: 'npm',
  };
}

/**
 * Synthetic baseline + current graphs so the HTML report shows introduced (parent, root, multi) and removed rows.
 */
export function buildDemoReportData(): {
  projectName: string;
  lockfileLabel: string;
  graph: LockfileGraph;
  baselineGraph: LockfileGraph;
  diff: GraphDiff;
} {
  const parentId = 'node_modules/parent';
  const parent = mkNode({
    id: parentId,
    name: 'parent',
    version: '2.0.0',
    parentId: null,
  });
  const nestedOld = mkNode({
    id: 'node_modules/parent/node_modules/nested-old',
    name: 'nested-old',
    version: '0.5.0',
    parentId,
  });
  const legacyDep = mkNode({
    id: 'node_modules/legacy-dep',
    name: 'legacy-dep',
    version: '1.2.0',
    parentId: null,
  });
  const libA = mkNode({
    id: 'node_modules/lib-a',
    name: 'lib-a',
    version: '1.0.0',
    parentId: null,
  });
  const libB = mkNode({
    id: 'node_modules/lib-b',
    name: 'lib-b',
    version: '1.0.0',
    parentId: null,
  });

  const baselineGraph = makeGraph([parent, nestedOld, legacyDep, libA, libB]);

  const nestedNew = mkNode({
    id: 'node_modules/parent/node_modules/nested-new',
    name: 'nested-new',
    version: '2.0.0',
    parentId,
  });
  const newRoot = mkNode({
    id: 'node_modules/new-root',
    name: 'new-root',
    version: '3.0.0',
    parentId: null,
  });
  const sharedChild = mkNode({
    id: 'node_modules/shared-child',
    name: 'shared-child',
    version: '1.0.0',
    parentId: 'node_modules/lib-a',
    additionalParentIds: ['node_modules/lib-b'],
  });

  const graph = makeGraph([parent, nestedNew, newRoot, libA, libB, sharedChild]);
  const diff = diffGraphs(baselineGraph, graph);

  return {
    projectName: 'demo-project',
    lockfileLabel: 'package-lock.json',
    graph,
    baselineGraph,
    diff,
  };
}
