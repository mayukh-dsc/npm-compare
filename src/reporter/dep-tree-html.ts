import type { DependencyTreeNode } from '../types.js';
import { escapeHtml } from './shared.js';

function dataDepSearch(node: DependencyTreeNode): string {
  const e = node.entry;
  return escapeHtml(`${e.name} ${e.version} ${e.integrity} ${e.resolved}`.toLowerCase());
}

function treeNode(
  node: DependencyTreeNode,
  renderLine: (node: DependencyTreeNode) => string,
  depth: number,
): string {
  const blob = dataDepSearch(node);
  if (node.children.length === 0) {
    return `<li class="dep-tree-item" data-dep-search="${blob}">
      <div class="dep-leaf">${renderLine(node)}</div>
    </li>`;
  }
  return `<li class="dep-tree-item dep-tree-branch" data-dep-search="${blob}">
    <details class="dep-node" ${depth < 1 ? 'open' : ''}>
      <summary class="dep-summary">${renderLine(node)}</summary>
      <ul class="dep-tree nested">${node.children.map((c) => treeNode(c, renderLine, depth + 1)).join('')}</ul>
    </details>
  </li>`;
}

/**
 * Renders a nested dependency tree (collapsible when a node has children).
 */
export function renderDependencyTreeHtml(
  nodes: DependencyTreeNode[],
  renderLine: (node: DependencyTreeNode) => string,
): string {
  if (nodes.length === 0) {
    return '<p class="text-muted tree-empty">No packages in this section.</p>';
  }
  return `<ul class="dep-tree" aria-label="Dependency tree">${nodes.map((n) => treeNode(n, renderLine, 0)).join('')}</ul>`;
}
