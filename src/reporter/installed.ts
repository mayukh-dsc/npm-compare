import type { DependencyTreeNode, Snapshot } from '../types.js';
import { renderDependencyTreeHtml } from './dep-tree-html.js';
import { escapeHtml, truncate, formatDate, commonStyles, sortScript } from './shared.js';

function packageRow(pkg: {
  name: string;
  version: string;
  integrity: string;
  resolved: string;
  dev?: boolean;
}): string {
  const isStandard =
    pkg.resolved === '' ||
    pkg.resolved.startsWith('https://registry.npmjs.org/') ||
    pkg.resolved.startsWith('https://registry.yarnpkg.com/');

  return `<tr>
    <td data-name="${escapeHtml(pkg.name)}">
      <a href="https://www.npmjs.com/package/${escapeHtml(pkg.name)}"
         target="_blank" rel="noopener noreferrer">${escapeHtml(pkg.name)}</a>
    </td>
    <td data-version="${escapeHtml(pkg.version)}">
      <span class="mono">${escapeHtml(pkg.version)}</span>
    </td>
    <td>
      <span class="badge ${pkg.dev ? 'badge-dev' : 'badge-prod'}">
        ${pkg.dev ? 'dev' : 'prod'}
      </span>
    </td>
    <td class="mono text-muted" title="${escapeHtml(pkg.integrity)}">
      ${escapeHtml(truncate(pkg.integrity, 24))}
    </td>
    <td class="${isStandard ? 'text-muted' : 'text-warning'}"
        title="${escapeHtml(pkg.resolved)}">
      ${isStandard ? '' : '<span class="badge badge-warning">⚠ Non-standard</span> '}
      ${escapeHtml(truncate(pkg.resolved, 70))}
    </td>
  </tr>`;
}

function installedTreeLine(node: DependencyTreeNode): string {
  const pkg = node.entry;
  const isStandard =
    pkg.resolved === '' ||
    pkg.resolved.startsWith('https://registry.npmjs.org/') ||
    pkg.resolved.startsWith('https://registry.yarnpkg.com/');

  return `
    <a href="https://www.npmjs.com/package/${escapeHtml(pkg.name)}"
       target="_blank" rel="noopener noreferrer">${escapeHtml(pkg.name)}</a>
    <span class="mono">${escapeHtml(pkg.version)}</span>
    <span class="badge ${pkg.dev ? 'badge-dev' : 'badge-prod'}">${pkg.dev ? 'dev' : 'prod'}</span>
    <span class="mono text-muted tree-int" title="${escapeHtml(pkg.integrity)}">${escapeHtml(truncate(pkg.integrity, 20))}</span>
    ${!isStandard ? '<span class="badge badge-warning">⚠ Non-standard</span>' : ''}
    <span class="tree-res text-muted" title="${escapeHtml(pkg.resolved)}">${escapeHtml(truncate(pkg.resolved, 48))}</span>
  `;
}

export function generateInstalledHtml(snapshot: Snapshot): string {
  const devCount = snapshot.packages.filter((p) => p.dev).length;
  const prodCount = snapshot.packages.length - devCount;
  const nonStandardCount = snapshot.packages.filter(
    (p) =>
      p.resolved !== '' &&
      !p.resolved.startsWith('https://registry.npmjs.org/') &&
      !p.resolved.startsWith('https://registry.yarnpkg.com/'),
  ).length;

  const trees = snapshot.dependencyTrees ?? { production: [], development: [] };
  const prodPkgs = snapshot.packages.filter((p) => !p.dev);
  const devPkgs = snapshot.packages.filter((p) => p.dev);

  const prodRows = prodPkgs.map((p) => packageRow(p)).join('\n');
  const devRows = devPkgs.map((p) => packageRow(p)).join('\n');

  const prodTreeHtml = renderDependencyTreeHtml(trees.production, installedTreeLine);
  const devTreeHtml = renderDependencyTreeHtml(trees.development, installedTreeLine);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>npm-compare — Installed Packages — ${escapeHtml(snapshot.projectName)}</title>
  <style>
    ${commonStyles()}
  </style>
</head>
<body>
  <div class="container">

    <header>
      <div class="brand">🔍 npm-compare</div>
      <h1>Installed Packages</h1>
      <div class="meta">
        <span><strong>Project:</strong> ${escapeHtml(snapshot.projectName)}@${escapeHtml(snapshot.projectVersion)}</span>
        <span><strong>Generated:</strong> ${formatDate(snapshot.generatedAt)}</span>
        <span><strong>Node:</strong> ${escapeHtml(snapshot.nodeVersion)}</span>
        <span><strong>Lock file version:</strong> ${snapshot.lockfileVersion}</span>
      </div>
    </header>

    <div class="stats-bar">
      <div class="stat-card">
        <div class="value">${snapshot.packages.length.toLocaleString()}</div>
        <div class="label">Total packages</div>
      </div>
      <div class="stat-card success">
        <div class="value">${prodCount.toLocaleString()}</div>
        <div class="label">Production</div>
      </div>
      <div class="stat-card">
        <div class="value">${devCount.toLocaleString()}</div>
        <div class="label">Dev only</div>
      </div>
      ${
        nonStandardCount > 0
          ? `<div class="stat-card warning">
              <div class="value">${nonStandardCount.toLocaleString()}</div>
              <div class="label">Non-standard registry</div>
            </div>`
          : ''
      }
    </div>

    ${
      nonStandardCount > 0
        ? `<div class="alert alert-warning">
            ⚠ <strong>${nonStandardCount} package(s)</strong> resolved from a non-standard registry URL.
            Review the "Resolved URL" column carefully.
           </div>`
        : `<div class="alert alert-success">
            ✔ All packages resolved from standard npm registry.
           </div>`
    }

    <div class="toolbar">
      <input id="search" class="search-input" type="text"
             placeholder="Filter production &amp; dev trees and flat tables…" />
      <span class="text-muted" style="font-size:12px">
        ${snapshot.packages.length.toLocaleString()} packages total
      </span>
    </div>

    <section class="report-section" aria-labelledby="sec-prod">
      <h2 id="sec-prod">Production dependencies</h2>
      <p class="text-muted" style="font-size:13px;margin-bottom:8px">
        Direct production roots and their transitive dependencies (from the lock file). Nested nodes are collapsible.
      </p>
      <div id="dep-tree-prod" class="tree-panel">${prodTreeHtml}</div>

      <details class="flat-toggle">
        <summary>Flat table (sortable)</summary>
        <div class="table-wrapper" style="margin-top:10px">
          <table id="pkg-table-prod">
            <thead>
              <tr>
                <th data-sort="name">Package ↕</th>
                <th data-sort="version">Version ↕</th>
                <th>Type</th>
                <th>Integrity (sha512)</th>
                <th>Resolved URL</th>
              </tr>
            </thead>
            <tbody>
              ${prodRows}
            </tbody>
          </table>
        </div>
      </details>
    </section>

    <section class="report-section" aria-labelledby="sec-dev">
      <h2 id="sec-dev">Development dependencies</h2>
      <p class="text-muted" style="font-size:13px;margin-bottom:8px">
        Dev-only dependency roots and their transitive dependencies.
      </p>
      <div id="dep-tree-dev" class="tree-panel">${devTreeHtml}</div>

      <details class="flat-toggle">
        <summary>Flat table (sortable)</summary>
        <div class="table-wrapper" style="margin-top:10px">
          <table id="pkg-table-dev">
            <thead>
              <tr>
                <th data-sort="name">Package ↕</th>
                <th data-sort="version">Version ↕</th>
                <th>Type</th>
                <th>Integrity (sha512)</th>
                <th>Resolved URL</th>
              </tr>
            </thead>
            <tbody>
              ${devRows}
            </tbody>
          </table>
        </div>
      </details>
    </section>

    <footer>
      Generated by
      <a href="https://github.com/mayukh-dsc/npm-compare"
         target="_blank" rel="noopener noreferrer">npm-compare</a>
      on ${formatDate(snapshot.generatedAt)}
    </footer>

  </div>
  <script>
    ${sortScript()}
    initSort('pkg-table-prod');
    initSort('pkg-table-dev');
    initReportSearch('search', ['pkg-table-prod', 'pkg-table-dev'], ['dep-tree-prod', 'dep-tree-dev']);
  </script>
</body>
</html>`;
}
