import { describe, it, expect } from 'vitest';
import { generateInstalledHtml } from '../../src/reporter/installed.js';
import type { Snapshot } from '../../src/types.js';

const makeSnapshot = (overrides: Partial<Snapshot> = {}): Snapshot => ({
  generatedAt: '2024-06-01T12:00:00.000Z',
  projectName: 'test-project',
  projectVersion: '1.0.0',
  nodeVersion: 'v20.0.0',
  lockfileVersion: 2,
  packages: [
    {
      name: 'lodash',
      version: '4.17.21',
      integrity: 'sha512-abc==',
      resolved: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
      dev: false,
    },
    {
      name: 'typescript',
      version: '5.4.5',
      integrity: 'sha512-def==',
      resolved: 'https://registry.npmjs.org/typescript/-/typescript-5.4.5.tgz',
      dev: true,
    },
  ],
  ...overrides,
});

describe('generateInstalledHtml', () => {
  it('returns a string containing DOCTYPE', () => {
    const html = generateInstalledHtml(makeSnapshot());
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('includes the project name in the output', () => {
    const html = generateInstalledHtml(makeSnapshot());
    expect(html).toContain('test-project');
  });

  it('includes package names as links to npmjs.com', () => {
    const html = generateInstalledHtml(makeSnapshot());
    expect(html).toContain('https://www.npmjs.com/package/lodash');
    expect(html).toContain('https://www.npmjs.com/package/typescript');
  });

  it('includes package versions', () => {
    const html = generateInstalledHtml(makeSnapshot());
    expect(html).toContain('4.17.21');
    expect(html).toContain('5.4.5');
  });

  it('shows dev badge for dev packages', () => {
    const html = generateInstalledHtml(makeSnapshot());
    expect(html).toContain('badge-dev');
    expect(html).toContain('badge-prod');
  });

  it('groups output into production and development sections', () => {
    const html = generateInstalledHtml(makeSnapshot());
    expect(html).toContain('Production dependencies');
    expect(html).toContain('Development dependencies');
    expect(html).toContain('dep-tree');
  });

  it('shows warning for non-standard registry URLs', () => {
    const snapshot = makeSnapshot({
      packages: [
        {
          name: 'private-pkg',
          version: '1.0.0',
          integrity: 'sha512-xyz==',
          resolved: 'https://my-company.jfrog.io/npm/private-pkg-1.0.0.tgz',
          dev: false,
        },
      ],
    });
    const html = generateInstalledHtml(snapshot);
    expect(html).toContain('Non-standard');
  });

  it('escapes HTML special characters in package names', () => {
    const snapshot = makeSnapshot({
      packages: [
        {
          name: '<script>alert(1)</script>',
          version: '1.0.0',
          integrity: 'sha512-abc==',
          resolved: 'https://registry.npmjs.org/x.tgz',
          dev: false,
        },
      ],
    });
    const html = generateInstalledHtml(snapshot);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('shows total package count in stats bar', () => {
    const html = generateInstalledHtml(makeSnapshot());
    expect(html).toContain('2');
  });

  it('is self-contained with no external CDN links', () => {
    const html = generateInstalledHtml(makeSnapshot());
    expect(html).not.toContain('cdn.jsdelivr.net');
    expect(html).not.toContain('unpkg.com');
    expect(html).not.toContain('googleapis.com');
  });
});
