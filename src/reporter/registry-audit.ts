import type {
  DependencyTreeNode,
  DependencyTrees,
  RegistryAudit,
  RegistryAuditEntry,
} from '../types.js';
import {
  isCriticalRegistryEntry,
  isRegistryWarningEntry,
} from '../strategies/registry.js';
import { renderDependencyTreeHtml } from './dep-tree-html.js';
import { escapeHtml, truncate, formatDate, commonStyles, sortScript } from './shared.js';

function statusBadge(entry: RegistryAuditEntry): string {
  if (!entry.integrityMatch && entry.registryIntegrity !== null) {
    return `<span class="badge badge-critical">🚨 Integrity mismatch</span>`;
  }
  if (entry.notFoundOnRegistry) {
    return `<span class="badge badge-warning">Not on registry</span>`;
  }
  if (!entry.isStandardRegistry) {
    return `<span class="badge badge-warning">⚠ Non-standard registry</span>`;
  }
  if (entry.hasInstallScript) {
    return `<span class="badge badge-warning">⚠ Install script</span>`;
  }
  if (entry.registryIntegrityMissing) {
    return `<span class="badge badge-warning">⚠ No registry integrity</span>`;
  }
  return `<span class="badge badge-ok">✔ OK</span>`;
}

function rowClass(entry: RegistryAuditEntry): string {
  if (!entry.integrityMatch && entry.registryIntegrity !== null) return 'row-critical';
  if (
    entry.notFoundOnRegistry ||
    !entry.isStandardRegistry ||
    entry.hasInstallScript ||
    entry.registryIntegrityMissing
  )
    return 'row-changed';
  return '';
}

function entryRow(entry: RegistryAuditEntry): string {
  const latestLabel =
    entry.isLatest === null
      ? '<span class="text-muted">—</span>'
      : entry.isLatest
        ? `<span class="text-muted">(latest)</span>`
        : `<span class="badge badge-warning">${escapeHtml(entry.latestVersion ?? '?')} available</span>`;

  return `<tr class="${rowClass(entry)}">
    <td data-name="${escapeHtml(entry.name)}">
      <a href="https://www.npmjs.com/package/${escapeHtml(entry.name)}"
         target="_blank" rel="noopener noreferrer">${escapeHtml(entry.name)}</a>
    </td>
    <td data-version="${escapeHtml(entry.version)}"><span class="mono">${escapeHtml(entry.version)}</span> ${latestLabel}</td>
    <td>${statusBadge(entry)}</td>
    <td class="mono" style="font-size:11px">
      ${
        entry.registryIntegrity !== null && !entry.integrityMatch
          ? `<div class="text-muted" title="${escapeHtml(entry.registryIntegrity)}">registry: ${escapeHtml(truncate(entry.registryIntegrity, 20))}</div>
             <div class="text-critical" title="${escapeHtml(entry.lockfileIntegrity)}">lockfile: ${escapeHtml(truncate(entry.lockfileIntegrity, 20))}</div>`
          : `<span class="text-muted" title="${escapeHtml(entry.lockfileIntegrity)}">${escapeHtml(truncate(entry.lockfileIntegrity, 24))}</span>`
      }
    </td>
    <td class="${entry.isStandardRegistry ? 'text-muted' : 'text-warning'}"
        title="${escapeHtml(entry.lockfileResolved)}"
        style="font-size:11px">
      ${escapeHtml(truncate(entry.lockfileResolved, 70))}
    </td>
    ${entry.hasInstallScript ? '<td><span class="badge badge-warning">⚠ Yes</span></td>' : '<td class="text-muted">—</td>'}
  </tr>`;
}

function sortSectionSubset(entries: RegistryAuditEntry[]): RegistryAuditEntry[] {
  const criticalEntries = entries.filter(isCriticalRegistryEntry);
  const warningEntries = entries.filter(isRegistryWarningEntry);
  const okEntries = entries.filter(
    (e) =>
      e.integrityMatch &&
      e.isStandardRegistry &&
      !e.notFoundOnRegistry &&
      !e.hasInstallScript &&
      !e.registryIntegrityMissing,
  );
  return [...criticalEntries, ...warningEntries, ...okEntries];
}

export function generateRegistryAuditHtml(
  audit: RegistryAudit,
  projectName: string,
  dependencyTrees?: DependencyTrees,
): string {
  const criticalEntries = audit.entries.filter(isCriticalRegistryEntry);
  const warningEntries = audit.entries.filter(isRegistryWarningEntry);
  const okEntries = audit.entries.filter(
    (e) =>
      e.integrityMatch &&
      e.isStandardRegistry &&
      !e.notFoundOnRegistry &&
      !e.hasInstallScript &&
      !e.registryIntegrityMissing,
  );

  const prodEntries = audit.entries.filter((e) => !e.dev);
  const devEntries = audit.entries.filter((e) => e.dev);
  const prodSorted = sortSectionSubset(prodEntries);
  const devSorted = sortSectionSubset(devEntries);
  const prodRows = prodSorted.map((e) => entryRow(e)).join('\n');
  const devRows = devSorted.map((e) => entryRow(e)).join('\n');

  const auditByKey = new Map<string, RegistryAuditEntry>();
  for (const e of audit.entries) {
    auditByKey.set(`${e.name}\0${e.version}`, e);
  }

  const registryTreeLine = (node: DependencyTreeNode): string => {
    const pkg = node.entry;
    const ae = auditByKey.get(`${pkg.name}\0${pkg.version}`);
    const badge = ae ? statusBadge(ae) : '<span class="badge badge-warning">—</span>';
    const integ = ae
      ? escapeHtml(truncate(ae.lockfileIntegrity, 18))
      : escapeHtml(truncate(pkg.integrity, 18));

    return `
    <a href="https://www.npmjs.com/package/${escapeHtml(pkg.name)}"
       target="_blank" rel="noopener noreferrer">${escapeHtml(pkg.name)}</a>
    <span class="mono">${escapeHtml(pkg.version)}</span>
    <span class="badge ${pkg.dev ? 'badge-dev' : 'badge-prod'}">${pkg.dev ? 'dev' : 'prod'}</span>
    ${badge}
    <span class="mono text-muted tree-int" title="${escapeHtml(ae?.lockfileIntegrity ?? pkg.integrity)}">${integ}</span>
  `;
  };

  const trees = dependencyTrees ?? { production: [], development: [] };
  const prodTreeHtml = renderDependencyTreeHtml(trees.production, registryTreeLine);
  const devTreeHtml = renderDependencyTreeHtml(trees.development, registryTreeLine);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>npm-compare — Registry Audit — ${escapeHtml(projectName)}</title>
  <style>
    ${commonStyles()}
  </style>
</head>
<body>
  <div class="container">

    <header>
      <div class="brand">🔍 npm-compare — Strategy: Registry</div>
      <h1>Registry Integrity Audit</h1>
      <div class="meta">
        <span><strong>Project:</strong> ${escapeHtml(projectName)}</span>
        <span><strong>Registry:</strong> ${escapeHtml(audit.registryUrl)}</span>
        <span><strong>Audited:</strong> ${formatDate(audit.auditedAt)}</span>
        <span><strong>Packages audited:</strong> ${audit.entries.length.toLocaleString()}</span>
        <span><strong>Production:</strong> ${prodEntries.length.toLocaleString()}</span>
        <span><strong>Development:</strong> ${devEntries.length.toLocaleString()}</span>
      </div>
    </header>

    ${
      criticalEntries.length > 0
        ? `<div class="alert alert-critical">
            🚨 <strong>CRITICAL: ${criticalEntries.length} integrity mismatch(es) detected.</strong>
            These packages have a different integrity hash in your lock file vs the npm registry.
            This may indicate a supply-chain attack. Do NOT run this code in production until resolved.
           </div>`
        : audit.warningCount > 0
          ? `<div class="alert alert-warning">
              ⚠ ${audit.warningCount} package(s) have warnings. Review them below.
             </div>`
          : `<div class="alert alert-success">
              ✔ All ${audit.entries.length.toLocaleString()} packages passed integrity checks.
             </div>`
    }

    <div class="stats-bar">
      <div class="stat-card">
        <div class="value">${audit.entries.length.toLocaleString()}</div>
        <div class="label">Audited</div>
      </div>
      <div class="stat-card ${criticalEntries.length > 0 ? 'critical' : ''}">
        <div class="value">${criticalEntries.length}</div>
        <div class="label">🚨 Critical</div>
      </div>
      <div class="stat-card ${warningEntries.length > 0 ? 'warning' : ''}">
        <div class="value">${warningEntries.length}</div>
        <div class="label">Warnings</div>
      </div>
      <div class="stat-card success">
        <div class="value">${okEntries.length.toLocaleString()}</div>
        <div class="label">✔ Passed</div>
      </div>
    </div>

    <div class="toolbar">
      <input id="search" class="search-input" type="text"
             placeholder="Filter production &amp; dev trees and flat tables…" />
    </div>

    <section class="report-section" aria-labelledby="reg-sec-prod">
      <h2 id="reg-sec-prod">Production dependencies</h2>
      <p class="text-muted" style="font-size:13px;margin-bottom:8px">
        Audit status is merged onto each node in the lock file dependency tree (same order as the installed report).
      </p>
      <div id="reg-dep-tree-prod" class="tree-panel">${prodTreeHtml}</div>

      <details class="flat-toggle">
        <summary>Flat table (sortable)</summary>
        <div class="table-wrapper" style="margin-top:10px">
          <table id="audit-table-prod">
            <thead>
              <tr>
                <th data-sort="name">Package ↕</th>
                <th data-sort="version">Version ↕</th>
                <th>Status</th>
                <th>Integrity (lock file vs registry)</th>
                <th>Resolved URL</th>
                <th>Install script</th>
              </tr>
            </thead>
            <tbody>
              ${prodRows}
            </tbody>
          </table>
        </div>
      </details>
    </section>

    <section class="report-section" aria-labelledby="reg-sec-dev">
      <h2 id="reg-sec-dev">Development dependencies</h2>
      <div id="reg-dep-tree-dev" class="tree-panel">${devTreeHtml}</div>

      <details class="flat-toggle">
        <summary>Flat table (sortable)</summary>
        <div class="table-wrapper" style="margin-top:10px">
          <table id="audit-table-dev">
            <thead>
              <tr>
                <th data-sort="name">Package ↕</th>
                <th data-sort="version">Version ↕</th>
                <th>Status</th>
                <th>Integrity (lock file vs registry)</th>
                <th>Resolved URL</th>
                <th>Install script</th>
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
      on ${formatDate(audit.auditedAt)} using the <strong>registry</strong> strategy.
    </footer>

  </div>
  <script>
    ${sortScript()}
    initSort('audit-table-prod');
    initSort('audit-table-dev');
    initReportSearch('search', ['audit-table-prod', 'audit-table-dev'], ['reg-dep-tree-prod', 'reg-dep-tree-dev']);
  </script>
</body>
</html>`;
}
