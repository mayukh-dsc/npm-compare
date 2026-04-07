import type {
  IntroducedDependency,
  IntroducerKind,
  LockfileGraph,
  LockfileNode,
} from './types.js';

export interface GraphDiff {
  introduced: IntroducedDependency[];
  removed: LockfileNode[];
}

/** Parents of a node in `graph` (for introduced rows in the current graph, or removed rows in the baseline graph). */
export function collectIntroducers(
  graph: LockfileGraph,
  node: LockfileNode,
): { introducer: LockfileNode | null; kind: IntroducerKind; introducers?: LockfileNode[] } {
  const parents: LockfileNode[] = [];
  if (node.parentId) {
    const p = graph.nodes.get(node.parentId);
    if (p) parents.push(p);
  }
  if (node.additionalParentIds?.length) {
    for (const pid of node.additionalParentIds) {
      const p = graph.nodes.get(pid);
      if (p && !parents.some((x) => x.id === p.id)) parents.push(p);
    }
  }

  if (parents.length === 0) {
    return { introducer: null, kind: 'root' };
  }
  if (parents.length === 1) {
    return { introducer: parents[0]!, kind: 'parent' };
  }
  return { introducer: parents[0]!, kind: 'multi', introducers: parents };
}

/**
 * Nodes present in `current` but not in `previous` (by `id`).
 * Skips synthetic importer nodes when marking introduced — those are structural only.
 * When `previous` is null (no baseline), returns empty introduced/removed lists.
 */
export function diffGraphs(
  previous: LockfileGraph | null,
  current: LockfileGraph,
): GraphDiff {
  if (!previous) {
    return { introduced: [], removed: [] };
  }

  const prevIds = new Set(previous.nodes.keys());

  const introduced: IntroducedDependency[] = [];
  for (const node of current.nodes.values()) {
    if (node.isImporter) continue;
    if (prevIds.has(node.id)) continue;

    const { introducer, kind, introducers } = collectIntroducers(current, node);
    const row: IntroducedDependency = {
      child: node,
      introducer,
      introducerKind: kind,
    };
    if (kind === 'multi' && introducers) {
      row.introducers = introducers;
    }
    introduced.push(row);
  }

  introduced.sort((a, b) => a.child.id.localeCompare(b.child.id));

  const removed: LockfileNode[] = [];
  if (previous) {
    const curIds = new Set(current.nodes.keys());
    for (const node of previous.nodes.values()) {
      if (node.isImporter) continue;
      if (!curIds.has(node.id)) {
        removed.push(node);
      }
    }
    removed.sort((a, b) => a.id.localeCompare(b.id));
  }

  return { introduced, removed };
}
