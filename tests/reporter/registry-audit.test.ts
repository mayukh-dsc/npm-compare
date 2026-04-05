import { describe, it, expect } from 'vitest';
import { generateRegistryAuditHtml } from '../../src/reporter/registry-audit.js';
import type { RegistryAudit } from '../../src/types.js';

const makeAudit = (overrides: Partial<RegistryAudit> = {}): RegistryAudit => ({
  strategy: 'registry',
  auditedAt: '2024-06-01T12:00:00.000Z',
  registryUrl: 'https://registry.npmjs.org',
  entries: [],
  criticalCount: 0,
  warningCount: 0,
  ...overrides,
});

describe('generateRegistryAuditHtml', () => {
  it('returns valid HTML', () => {
    const html = generateRegistryAuditHtml(makeAudit(), 'my-project');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('shows clean state when no issues', () => {
    const html = generateRegistryAuditHtml(makeAudit(), 'my-project');
    expect(html).toContain('passed integrity checks');
  });

  it('shows critical alert for integrity mismatches', () => {
    const audit = makeAudit({
      criticalCount: 1,
      entries: [
        {
          name: 'axios',
          version: '1.6.0',
          lockfileIntegrity: 'sha512-TAMPERED==',
          registryIntegrity: 'sha512-REAL==',
          lockfileResolved: 'https://registry.npmjs.org/axios-1.6.0.tgz',
          isStandardRegistry: true,
          integrityMatch: false,
          latestVersion: '1.6.0',
          isLatest: true,
          notFoundOnRegistry: false,
          hasInstallScript: false,
          registryIntegrityMissing: false,
        },
      ],
    });
    const html = generateRegistryAuditHtml(audit, 'my-project');
    expect(html).toContain('CRITICAL');
    expect(html).toContain('supply-chain attack');
    expect(html).toContain('axios');
    expect(html).toContain('row-critical');
  });

  it('shows ok badge for clean entries', () => {
    const audit = makeAudit({
      entries: [
        {
          name: 'lodash',
          version: '4.17.21',
          lockfileIntegrity: 'sha512-SAME==',
          registryIntegrity: 'sha512-SAME==',
          lockfileResolved: 'https://registry.npmjs.org/lodash-4.17.21.tgz',
          isStandardRegistry: true,
          integrityMatch: true,
          latestVersion: '4.17.21',
          isLatest: true,
          notFoundOnRegistry: false,
          hasInstallScript: false,
          registryIntegrityMissing: false,
        },
      ],
    });
    const html = generateRegistryAuditHtml(audit, 'my-project');
    expect(html).toContain('badge-ok');
    expect(html).toContain('✔ OK');
  });

  it('includes registry URL in output', () => {
    const html = generateRegistryAuditHtml(makeAudit(), 'my-project');
    expect(html).toContain('registry.npmjs.org');
  });

  it('renders production and development sections', () => {
    const html = generateRegistryAuditHtml(makeAudit(), 'my-project');
    expect(html).toContain('Production dependencies');
    expect(html).toContain('Development dependencies');
  });

  it('escapes HTML in package names', () => {
    const audit = makeAudit({
      entries: [
        {
          name: '<xss>',
          version: '1.0.0',
          lockfileIntegrity: 'sha512-abc==',
          registryIntegrity: 'sha512-abc==',
          lockfileResolved: 'https://registry.npmjs.org/',
          isStandardRegistry: true,
          integrityMatch: true,
          latestVersion: '1.0.0',
          isLatest: true,
          notFoundOnRegistry: false,
          hasInstallScript: false,
          registryIntegrityMissing: false,
        },
      ],
    });
    const html = generateRegistryAuditHtml(audit, 'my-project');
    expect(html).not.toContain('<xss>');
    expect(html).toContain('&lt;xss&gt;');
  });

  it('has no external CDN dependencies', () => {
    const html = generateRegistryAuditHtml(makeAudit(), 'my-project');
    expect(html).not.toContain('cdn.');
    expect(html).not.toContain('unpkg.com');
  });

  it('shows warning badge when registry integrity is missing', () => {
    const audit = makeAudit({
      warningCount: 1,
      entries: [
        {
          name: 'legacy',
          version: '1.0.0',
          lockfileIntegrity: 'sha512-lock==',
          registryIntegrity: null,
          lockfileResolved: 'https://registry.npmjs.org/legacy/-/legacy-1.0.0.tgz',
          isStandardRegistry: true,
          integrityMatch: true,
          latestVersion: '1.0.0',
          isLatest: true,
          notFoundOnRegistry: false,
          hasInstallScript: false,
          registryIntegrityMissing: true,
        },
      ],
    });
    const html = generateRegistryAuditHtml(audit, 'my-project');
    expect(html).toContain('No registry integrity');
    expect(html).not.toContain('passed integrity checks');
  });
});
