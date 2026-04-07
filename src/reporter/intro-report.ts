import { collectIntroducers, type GraphDiff } from '../graph/diff.js';
import type {
  IntroducedDependency,
  IntroducerKind,
  LockfileGraph,
  LockfileNode,
} from '../graph/types.js';
import { escapeHtml, formatDate, commonStyles } from './shared.js';

function introducerLabel(row: IntroducedDependency): string {
  if (row.introducerKind === 'multi' && row.introducers?.length) {
    return row.introducers
      .map((n) => `${n.name}@${n.version || '?'}`)
      .join(', ');
  }
  if (row.introducerKind === 'root' || !row.introducer) {
    return 'Workspace root (hoisted or direct)';
  }
  const p = row.introducer;
  return `${p.name}@${p.version || '?'}`;
}

function introSentence(row: IntroducedDependency): string {
  const child = `${row.child.name}@${row.child.version || '?'}`;
  const from = introducerLabel(row);
  if (row.introducerKind === 'multi') {
    return `${child} was introduced (multiple dependents: ${from}).`;
  }
  return `${from} introduced ${child}.`;
}

function labelForIntroducerParts(
  kind: IntroducerKind,
  introducer: LockfileNode | null,
  introducers: LockfileNode[] | undefined,
): string {
  if (kind === 'multi' && introducers?.length) {
    return introducers.map((n) => `${n.name}@${n.version || '?'}`).join(', ');
  }
  if (kind === 'root' || !introducer) {
    return 'Workspace root (hoisted or direct)';
  }
  return `${introducer.name}@${introducer.version || '?'}`;
}

function removedSentence(
  node: LockfileNode,
  kind: IntroducerKind,
  introducer: LockfileNode | null,
  introducers: LockfileNode[] | undefined,
): string {
  const child = `${node.name}@${node.version || '?'}`;
  const from = labelForIntroducerParts(kind, introducer, introducers);
  if (kind === 'multi') {
    return `${child} was removed from the lockfile (was under multiple dependents: ${from}).`;
  }
  return `${child} was removed from the lockfile; was previously under ${from}.`;
}

export function generateIntroReportHtml(
  projectName: string,
  lockfileLabel: string,
  graph: LockfileGraph,
  diff: GraphDiff,
  options: {
    generatedAt: string;
    hasGitBaseline: boolean;
    baselineReason: string | null;
    baselineGraph?: LockfileGraph | null;
  },
): string {
  const baselineGraph = options.baselineGraph ?? null;
  const rows = diff.introduced;
  const removedNodes = diff.removed;
  const removedCount = removedNodes.length;

  const rowHtml = rows
    .map((row) => {
      return `<tr class="row-introduced">
  <td class="mono" data-child="${escapeHtml(row.child.name)}">${escapeHtml(row.child.name)}</td>
  <td class="mono" data-version="${escapeHtml(row.child.version)}">${escapeHtml(row.child.version)}</td>
  <td>${escapeHtml(introducerLabel(row))}</td>
  <td class="mono text-muted">${escapeHtml(row.introducerKind)}</td>
  <td>${escapeHtml(introSentence(row))}</td>
  <td class="mono text-muted">${escapeHtml(row.child.id)}</td>
</tr>`;
    })
    .join('\n');

  const removedRowHtml = removedNodes
    .map((node) => {
      let kind: IntroducerKind = 'root';
      let introducer: LockfileNode | null = null;
      let introducers: LockfileNode[] | undefined;
      if (baselineGraph) {
        const collected = collectIntroducers(baselineGraph, node);
        kind = collected.kind;
        introducer = collected.introducer;
        introducers = collected.introducers;
      }
      const underLabel = baselineGraph
        ? escapeHtml(labelForIntroducerParts(kind, introducer, introducers))
        : '—';
      const summary = baselineGraph
        ? escapeHtml(removedSentence(node, kind, introducer, introducers))
        : escapeHtml(
            `${node.name}@${node.version || '?'} was removed from the lockfile (baseline graph unavailable for parent resolution).`,
          );
      const kindCell = baselineGraph ? escapeHtml(kind) : '—';
      return `<tr class="row-removed-baseline">
  <td class="mono">${escapeHtml(node.name)}</td>
  <td class="mono">${escapeHtml(node.version)}</td>
  <td>${underLabel}</td>
  <td class="mono text-muted">${kindCell}</td>
  <td>${summary}</td>
  <td class="mono text-muted">${escapeHtml(node.id)}</td>
</tr>`;
    })
    .join('\n');

  let alert = '';
  if (options.baselineReason) {
    alert = `<div class="alert alert-warning">${escapeHtml(options.baselineReason)}</div>`;
  } else if (!options.hasGitBaseline) {
    alert =
      '<div class="alert alert-warning">No git baseline: initialize a repository and commit your lockfile to compare against <code>HEAD</code>.</div>';
  } else if (rows.length === 0) {
    alert =
      '<div class="alert alert-success">No newly introduced packages compared to the last committed lockfile.</div>';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>what-new-pkg — introduced dependencies</title>
  <style>${commonStyles()}
    :root {
      --introduced-border: #e65100;
      --introduced-bg: #fff3e0;
      --introduced-text: #bf360c;
      --introduced-row: #fff8f0;
      --removed-border: var(--success-border);
      --removed-bg: var(--success-bg);
      --removed-text: var(--success-text);
      --removed-row: #f0fff4;
    }
    .stat-card--introduced {
      border-color: var(--introduced-border);
      background: var(--introduced-bg);
    }
    .stat-card--introduced .value { color: var(--introduced-text); }
    .stat-card--removed-green {
      border-color: var(--removed-border);
      background: var(--removed-bg);
    }
    .stat-card--removed-green .value { color: var(--removed-text); }
    .row-introduced td { background: var(--introduced-row) !important; }
    .row-removed-baseline td { background: var(--removed-row) !important; }
    .intro-highlight { font-weight: 600; color: var(--introduced-text); }
    .table-wrapper + .table-wrapper { margin-top: 16px; }
    .section-heading { font-size: 15px; font-weight: 600; margin: 20px 0 10px; color: var(--text); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">what-new-pkg</div>
      <h1>Newly introduced dependencies</h1>
      <div class="meta">
        <span><strong>Project:</strong> ${escapeHtml(projectName)}</span>
        <span><strong>Lockfile:</strong> ${escapeHtml(lockfileLabel)}</span>
        <span><strong>Format:</strong> ${escapeHtml(graph.kind)}</span>
        <span><strong>Generated:</strong> ${escapeHtml(formatDate(options.generatedAt))}</span>
      </div>
    </header>

    ${alert}

    <div class="stats-bar">
      <div class="stat-card stat-card--introduced">
        <div class="value">${rows.length}</div>
        <div class="label">Introduced</div>
      </div>
      <div class="stat-card stat-card--removed-green">
        <div class="value">${removedCount}</div>
        <div class="label">Removed</div>
      </div>
      <div class="stat-card">
        <div class="value">${graph.nodes.size}</div>
        <div class="label">Nodes in graph</div>
      </div>
    </div>

    <p class="text-muted" style="margin-bottom:12px;">
      Each row links a <span class="intro-highlight">new</span> resolved package to the package that depends on it in the lockfile (or workspace root when hoisted).
    </p>

    <div class="toolbar">
      <input type="search" class="search-input" id="intro-search" placeholder="Filter by package, version, introducer…" />
    </div>

    <h2 class="section-heading">Introduced packages</h2>
    <div class="table-wrapper">
      <table id="intro-table">
        <thead>
          <tr>
            <th>Package</th>
            <th>Version</th>
            <th>Introduced by</th>
            <th>Kind</th>
            <th>Summary</th>
            <th>Lock id</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rowHtml : '<tr><td colspan="6" class="text-muted">No rows.</td></tr>'}
        </tbody>
      </table>
    </div>

    <h2 class="section-heading">Removed packages</h2>
    <div class="table-wrapper">
      <table id="removed-table">
        <thead>
          <tr>
            <th>Package</th>
            <th>Version</th>
            <th>Previously under</th>
            <th>Kind</th>
            <th>Summary</th>
            <th>Lock id</th>
          </tr>
        </thead>
        <tbody>
          ${removedCount ? removedRowHtml : '<tr><td colspan="6" class="text-muted">No rows.</td></tr>'}
        </tbody>
      </table>
    </div>

    <footer>
      Open source — what-new-pkg
    </footer>
  </div>
  <script>
    (function () {
      var input = document.getElementById('intro-search');
      var tables = [document.getElementById('intro-table'), document.getElementById('removed-table')];
      if (!input) return;
      input.addEventListener('input', function () {
        var q = input.value.toLowerCase().trim();
        tables.forEach(function (table) {
          if (!table) return;
          table.querySelectorAll('tbody tr').forEach(function (row) {
            row.classList.toggle('hidden', q !== '' && !row.textContent.toLowerCase().includes(q));
          });
        });
      });
    })();
  </script>
</body>
</html>`;
}
