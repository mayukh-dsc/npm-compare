import { describe, it, expect } from 'vitest';
import { generateGitDiffHtml } from '../../src/reporter/git-diff.js';
import type { PackageDiff } from '../../src/types.js';

const makeEmptyDiff = (): PackageDiff => ({
  strategy: 'git',
  previousSnapshotDate: '2024-01-01T00:00:00.000Z',
  added: [],
  removed: [],
  changed: [],
  unchanged: [],
});

describe('generateGitDiffHtml', () => {
  it('returns valid HTML', () => {
    const html = generateGitDiffHtml(makeEmptyDiff(), 'my-project');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('shows clean state message when no changes', () => {
    const html = generateGitDiffHtml(makeEmptyDiff(), 'my-project');
    expect(html).toContain('No package changes detected');
  });

  it('shows critical alert for integrity mismatch', () => {
    const diff: PackageDiff = {
      ...makeEmptyDiff(),
      changed: [
        {
          name: 'axios',
          from: {
            name: 'axios',
            version: '1.6.0',
            integrity: 'sha512-SAFE==',
            resolved: 'https://registry.npmjs.org/axios-1.6.0.tgz',
          },
          to: {
            name: 'axios',
            version: '1.6.0',
            integrity: 'sha512-TAMPERED==',
            resolved: 'https://registry.npmjs.org/axios-1.6.0.tgz',
          },
          versionChanged: false,
          integrityChanged: true,
          resolvedChanged: false,
        },
      ],
    };
    const html = generateGitDiffHtml(diff, 'my-project');
    expect(html).toContain('CRITICAL');
    expect(html).toContain('integrity mismatch');
    expect(html).toContain('row-critical');
  });

  it('shows added packages with correct badge', () => {
    const diff: PackageDiff = {
      ...makeEmptyDiff(),
      added: [
        {
          name: 'new-package',
          version: '2.0.0',
          integrity: 'sha512-new==',
          resolved: 'https://registry.npmjs.org/new-package-2.0.0.tgz',
        },
      ],
    };
    const html = generateGitDiffHtml(diff, 'my-project');
    expect(html).toContain('new-package');
    expect(html).toContain('badge-added');
  });

  it('renders version-only change (non-critical)', () => {
    const diff: PackageDiff = {
      ...makeEmptyDiff(),
      changed: [
        {
          name: 'semver',
          from: {
            name: 'semver',
            version: '7.5.0',
            integrity: 'sha512-a==',
            resolved: 'https://registry.npmjs.org/semver/-/semver-7.5.0.tgz',
          },
          to: {
            name: 'semver',
            version: '7.6.0',
            integrity: 'sha512-a==',
            resolved: 'https://registry.npmjs.org/semver/-/semver-7.6.0.tgz',
          },
          versionChanged: true,
          integrityChanged: false,
          resolvedChanged: true,
        },
      ],
    };
    const html = generateGitDiffHtml(diff, 'my-project');
    expect(html).toContain('7.5.0');
    expect(html).toContain('7.6.0');
    expect(html).toContain('Version changed');
  });

  it('renders resolved-URL-only change', () => {
    const diff: PackageDiff = {
      ...makeEmptyDiff(),
      changed: [
        {
          name: 'pkg',
          from: {
            name: 'pkg',
            version: '1.0.0',
            integrity: 'sha512-same==',
            resolved: 'https://registry.npmjs.org/a.tgz',
          },
          to: {
            name: 'pkg',
            version: '1.0.0',
            integrity: 'sha512-same==',
            resolved: 'https://registry.npmjs.org/b.tgz',
          },
          versionChanged: false,
          integrityChanged: false,
          resolvedChanged: true,
        },
      ],
    };
    const html = generateGitDiffHtml(diff, 'my-project');
    expect(html).toContain('URL changed');
    expect(html).toContain('registry.npmjs.org/b.tgz');
  });

  it('shows removed packages', () => {
    const diff: PackageDiff = {
      ...makeEmptyDiff(),
      removed: [
        {
          name: 'old-package',
          version: '1.0.0',
          integrity: 'sha512-old==',
          resolved: 'https://registry.npmjs.org/old-package-1.0.0.tgz',
        },
      ],
    };
    const html = generateGitDiffHtml(diff, 'my-project');
    expect(html).toContain('old-package');
    expect(html).toContain('badge-removed');
  });

  it('escapes HTML in package names', () => {
    const diff: PackageDiff = {
      ...makeEmptyDiff(),
      added: [
        {
          name: '<evil>',
          version: '1.0.0',
          integrity: 'sha512-abc==',
          resolved: 'https://registry.npmjs.org/',
        },
      ],
    };
    const html = generateGitDiffHtml(diff, 'my-project');
    expect(html).not.toContain('<evil>');
    expect(html).toContain('&lt;evil&gt;');
  });

  it('has no external CDN dependencies', () => {
    const html = generateGitDiffHtml(makeEmptyDiff(), 'my-project');
    expect(html).not.toContain('cdn.');
    expect(html).not.toContain('unpkg.com');
  });
});
