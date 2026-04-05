import type { PackageDiff, ChangedPackage, PackageEntry } from '../types.js';
import { escapeHtml, truncate, formatDate, commonStyles, sortScript } from './shared.js';

function packageRow(pkg: PackageEntry, rowClass: string, badge: string): string {
  return `<tr class="${rowClass}">
    <td data-name="${escapeHtml(pkg.name)}">
      <a href="https://www.npmjs.com/package/${escapeHtml(pkg.name)}"
         target="_blank" rel="noopener noreferrer">${escapeHtml(pkg.name)}</a>
    </td>
    <td><span class="mono">${escapeHtml(pkg.version)}</span></td>
    <td><span class="badge ${badge.split('|')[1] ?? ''}">${badge.split('|')[0] ?? ''}</span></td>
    <td class="mono text-muted" title="${escapeHtml(pkg.integrity)}">${escapeHtml(truncate(pkg.integrity, 24))}</td>
    <td class="text-muted" title="${escapeHtml(pkg.resolved)}">${escapeHtml(truncate(pkg.resolved, 70))}</td>
  </tr>`;
}

function changedRow(c: ChangedPackage): string {
  const isCritical = c.integrityChanged && !c.versionChanged;
  const rowClass = isCritical ? 'row-critical' : 'row-changed';

  return `<tr class="${rowClass}">
    <td data-name="${escapeHtml(c.name)}">
      <a href="https://www.npmjs.com/package/${escapeHtml(c.name)}"
         target="_blank" rel="noopener noreferrer">${escapeHtml(c.name)}</a>
    </td>
    <td>
      ${
        c.versionChanged
          ? `<span class="mono">${escapeHtml(c.from.version)}</span>
             <span class="text-muted"> → </span>
             <span class="mono">${escapeHtml(c.to.version)}</span>`
          : `<span class="mono">${escapeHtml(c.to.version)}</span>`
      }
    </td>
    <td>
      ${
        isCritical
          ? `<span class="badge badge-critical">🚨 Integrity mismatch</span>`
          : c.versionChanged
            ? `<span class="badge badge-changed">Version changed</span>`
            : `<span class="badge badge-warning">URL changed</span>`
      }
    </td>
    <td class="mono" style="font-size:11px">
      ${
        c.integrityChanged
          ? `<div class="text-muted" title="${escapeHtml(c.from.integrity)}">before: ${escapeHtml(truncate(c.from.integrity, 20))}</div>
             <div class="text-critical" title="${escapeHtml(c.to.integrity)}">after:  ${escapeHtml(truncate(c.to.integrity, 20))}</div>`
          : `<span class="text-muted" title="${escapeHtml(c.to.integrity)}">${escapeHtml(truncate(c.to.integrity, 24))}</span>`
      }
    </td>
    <td class="text-muted" style="font-size:11px" title="${escapeHtml(c.to.resolved)}">${escapeHtml(truncate(c.to.resolved, 70))}</td>
  </tr>`;
}

export function generateGitDiffHtml(diff: PackageDiff, projectName: string): string {
  const criticalChanges = diff.changed.filter((c) => c.integrityChanged && !c.versionChanged);
  const nonCriticalChanges = diff.changed.filter(
    (c) => !(c.integrityChanged && !c.versionChanged),
  );

  const prodCritical = criticalChanges.filter((c) => !c.to.dev);
  const prodNonCritical = nonCriticalChanges.filter((c) => !c.to.dev);
  const prodAdded = diff.added.filter((p) => !p.dev);
  const prodRemoved = diff.removed.filter((p) => !p.dev);

  const devCritical = criticalChanges.filter((c) => c.to.dev);
  const devNonCritical = nonCriticalChanges.filter((c) => c.to.dev);
  const devAdded = diff.added.filter((p) => p.dev);
  const devRemoved = diff.removed.filter((p) => p.dev);

  const buildSectionRows = (
    crit: ChangedPackage[],
    nonCrit: ChangedPackage[],
    added: PackageEntry[],
    removed: PackageEntry[],
  ): string =>
    [
      ...crit.map((c) => changedRow(c)),
      ...nonCrit.map((c) => changedRow(c)),
      ...added.map((p) => packageRow(p, 'row-added', 'Added|badge-added')),
      ...removed.map((p) => packageRow(p, 'row-removed', 'Removed|badge-removed')),
    ].join('\n');

  const prodRows = buildSectionRows(prodCritical, prodNonCritical, prodAdded, prodRemoved);
  const devRows = buildSectionRows(devCritical, devNonCritical, devAdded, devRemoved);

  const totalChanged = diff.changed.length + diff.added.length + diff.removed.length;
  const generatedAt = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>npm-compare — Git Diff — ${escapeHtml(projectName)}</title>
  <style>
    ${commonStyles()}
  </style>
</head>
<body>
  <div class="container">

    <header>
      <div class="brand">🔍 npm-compare — Strategy: Git</div>
      <h1>Package Diff (vs last commit)</h1>
      <div class="meta">
        <span><strong>Project:</strong> ${escapeHtml(projectName)}</span>
        <span><strong>Previous snapshot:</strong> ${formatDate(diff.previousSnapshotDate)}</span>
        <span><strong>Generated:</strong> ${formatDate(generatedAt)}</span>
      </div>
    </header>

    ${
      criticalChanges.length > 0
        ? `<div class="alert alert-critical">
            🚨 <strong>CRITICAL: ${criticalChanges.length} integrity mismatch(es) detected.</strong>
            The same package version now has a different integrity hash — this is a strong indicator
            of a supply-chain attack. Review these packages immediately.
           </div>`
        : totalChanged > 0
          ? `<div class="alert alert-warning">
              ⚠ ${totalChanged} package change(s) detected since last commit.
             </div>`
          : `<div class="alert alert-success">
              ✔ No package changes detected since last commit.
             </div>`
    }

    <div class="stats-bar">
      ${
        criticalChanges.length > 0
          ? `<div class="stat-card critical">
              <div class="value">${criticalChanges.length}</div>
              <div class="label">🚨 Integrity changed</div>
            </div>`
          : ''
      }
      <div class="stat-card ${diff.changed.length > 0 ? 'warning' : ''}">
        <div class="value">${diff.changed.length}</div>
        <div class="label">Changed</div>
      </div>
      <div class="stat-card ${diff.added.length > 0 ? 'success' : ''}">
        <div class="value">${diff.added.length}</div>
        <div class="label">Added</div>
      </div>
      <div class="stat-card ${diff.removed.length > 0 ? 'critical' : ''}">
        <div class="value">${diff.removed.length}</div>
        <div class="label">Removed</div>
      </div>
      <div class="stat-card">
        <div class="value">${diff.unchanged.length}</div>
        <div class="label">Unchanged</div>
      </div>
    </div>

    ${
      totalChanged > 0
        ? `<div class="toolbar">
            <input id="search" class="search-input" type="text"
                   placeholder="Filter production &amp; dev change tables…" />
          </div>

          <section class="report-section" aria-labelledby="git-sec-prod">
            <h2 id="git-sec-prod">Production dependency changes</h2>
            ${
              prodRows.length === 0
                ? `<p class="text-muted" style="font-size:13px">No production dependency changes.</p>`
                : `<div class="table-wrapper">
                    <table id="diff-table-prod">
                      <thead>
                        <tr>
                          <th data-sort="name">Package ↕</th>
                          <th>Version</th>
                          <th>Change</th>
                          <th>Integrity</th>
                          <th>Resolved URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${prodRows}
                      </tbody>
                    </table>
                  </div>`
            }
          </section>

          <section class="report-section" aria-labelledby="git-sec-dev">
            <h2 id="git-sec-dev">Development dependency changes</h2>
            ${
              devRows.length === 0
                ? `<p class="text-muted" style="font-size:13px">No development dependency changes.</p>`
                : `<div class="table-wrapper">
                    <table id="diff-table-dev">
                      <thead>
                        <tr>
                          <th data-sort="name">Package ↕</th>
                          <th>Version</th>
                          <th>Change</th>
                          <th>Integrity</th>
                          <th>Resolved URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${devRows}
                      </tbody>
                    </table>
                  </div>`
            }
          </section>`
        : `<div class="alert alert-success" style="margin-top: 8px;">
            No changes to display.
           </div>`
    }

    <footer>
      Generated by
      <a href="https://github.com/mayukh-dsc/npm-compare"
         target="_blank" rel="noopener noreferrer">npm-compare</a>
      on ${formatDate(generatedAt)} using the <strong>git</strong> strategy.
    </footer>

  </div>
  <script>
    ${sortScript()}
    initSort('diff-table-prod');
    initSort('diff-table-dev');
    initReportSearch('search', ['diff-table-prod', 'diff-table-dev'], []);
  </script>
</body>
</html>`;
}
