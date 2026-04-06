import type { GraphDiff } from '../graph/diff.js';
import type { IntroducedDependency, LockfileGraph } from '../graph/types.js';
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

export function generateIntroReportHtml(
  projectName: string,
  lockfileLabel: string,
  graph: LockfileGraph,
  diff: GraphDiff,
  options: {
    generatedAt: string;
    hasGitBaseline: boolean;
    baselineReason: string | null;
  },
): string {
  const rows = diff.introduced;
  const removedCount = diff.removed.length;

  const rowHtml = rows
    .map((row) => {
      const cls = 'row-added';
      return `<tr class="${cls}">
  <td class="mono" data-child="${escapeHtml(row.child.name)}">${escapeHtml(row.child.name)}</td>
  <td class="mono" data-version="${escapeHtml(row.child.version)}">${escapeHtml(row.child.version)}</td>
  <td>${escapeHtml(introducerLabel(row))}</td>
  <td class="mono text-muted">${escapeHtml(row.introducerKind)}</td>
  <td>${escapeHtml(introSentence(row))}</td>
  <td class="mono text-muted">${escapeHtml(row.child.id)}</td>
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
    .row-added td { background: #f0fff4 !important; }
    .intro-highlight { font-weight: 600; color: var(--success-text); }
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
      <div class="stat-card success">
        <div class="value">${rows.length}</div>
        <div class="label">Introduced</div>
      </div>
      <div class="stat-card">
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

    <footer>
      Open source — what-new-pkg
    </footer>
  </div>
  <script>
    (function () {
      var input = document.getElementById('intro-search');
      var table = document.getElementById('intro-table');
      if (!input || !table) return;
      input.addEventListener('input', function () {
        var q = input.value.toLowerCase().trim();
        table.querySelectorAll('tbody tr').forEach(function (row) {
          row.classList.toggle('hidden', q !== '' && !row.textContent.toLowerCase().includes(q));
        });
      });
    })();
  </script>
</body>
</html>`;
}
