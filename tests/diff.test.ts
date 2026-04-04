import { describe, it, expect } from 'vitest';
import { diffPackages, hasCriticalChanges } from '../src/diff.js';
import type { PackageEntry } from '../src/types.js';

const pkg = (overrides: Partial<PackageEntry> & { name: string }): PackageEntry => ({
  version: '1.0.0',
  integrity: 'sha512-abc==',
  resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
  dev: false,
  optional: false,
  ...overrides,
});

const PREV_DATE = '2024-01-01T00:00:00.000Z';

describe('diffPackages', () => {
  it('returns empty diff for identical package lists', () => {
    const packages = [pkg({ name: 'lodash' }), pkg({ name: 'axios' })];
    const diff = diffPackages(packages, packages, PREV_DATE);

    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(2);
  });

  it('detects added packages', () => {
    const previous = [pkg({ name: 'lodash' })];
    const current = [pkg({ name: 'lodash' }), pkg({ name: 'axios' })];
    const diff = diffPackages(previous, current, PREV_DATE);

    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]?.name).toBe('axios');
    expect(diff.removed).toHaveLength(0);
  });

  it('detects removed packages', () => {
    const previous = [pkg({ name: 'lodash' }), pkg({ name: 'axios' })];
    const current = [pkg({ name: 'lodash' })];
    const diff = diffPackages(previous, current, PREV_DATE);

    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]?.name).toBe('axios');
    expect(diff.added).toHaveLength(0);
  });

  it('detects version changes', () => {
    const previous = [pkg({ name: 'lodash', version: '4.17.20' })];
    const current = [pkg({ name: 'lodash', version: '4.17.21' })];
    const diff = diffPackages(previous, current, PREV_DATE);

    expect(diff.changed).toHaveLength(1);
    const change = diff.changed[0]!;
    expect(change.versionChanged).toBe(true);
    expect(change.integrityChanged).toBe(false);
    expect(change.from.version).toBe('4.17.20');
    expect(change.to.version).toBe('4.17.21');
  });

  it('detects integrity changes (supply-chain attack signal)', () => {
    const previous = [pkg({ name: 'axios', version: '1.6.0', integrity: 'sha512-SAFE==' })];
    const current = [pkg({ name: 'axios', version: '1.6.0', integrity: 'sha512-TAMPERED==' })];
    const diff = diffPackages(previous, current, PREV_DATE);

    expect(diff.changed).toHaveLength(1);
    const change = diff.changed[0]!;
    expect(change.integrityChanged).toBe(true);
    expect(change.versionChanged).toBe(false);
  });

  it('detects resolved URL changes', () => {
    const previous = [pkg({ name: 'foo', resolved: 'https://registry.npmjs.org/foo-1.0.0.tgz' })];
    const current = [
      pkg({ name: 'foo', resolved: 'https://evil-mirror.com/foo-1.0.0.tgz' }),
    ];
    const diff = diffPackages(previous, current, PREV_DATE);

    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]?.resolvedChanged).toBe(true);
  });

  it('does not flag integrity change when previous integrity is empty string', () => {
    const previous = [pkg({ name: 'foo', integrity: '' })];
    const current = [pkg({ name: 'foo', integrity: 'sha512-NEWHASH==' })];
    const diff = diffPackages(previous, current, PREV_DATE);

    // Package has no previous integrity to compare against — treated as unchanged (no false positive)
    expect(diff.changed).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(1);
  });

  it('sorts results alphabetically', () => {
    const previous = [pkg({ name: 'zebra' })];
    const current = [
      pkg({ name: 'apple' }),
      pkg({ name: 'mango' }),
      pkg({ name: 'banana' }),
    ];
    const diff = diffPackages(previous, current, PREV_DATE);
    const addedNames = diff.added.map((p) => p.name);
    expect(addedNames).toEqual([...addedNames].sort());
  });

  it('sets strategy and previousSnapshotDate correctly', () => {
    const diff = diffPackages([], [], PREV_DATE);
    expect(diff.strategy).toBe('git');
    expect(diff.previousSnapshotDate).toBe(PREV_DATE);
  });
});

describe('hasCriticalChanges', () => {
  it('returns true when integrity changed without version change', () => {
    const diff = diffPackages(
      [pkg({ name: 'axios', version: '1.6.0', integrity: 'sha512-SAFE==' })],
      [pkg({ name: 'axios', version: '1.6.0', integrity: 'sha512-TAMPERED==' })],
      PREV_DATE,
    );
    expect(hasCriticalChanges(diff)).toBe(true);
  });

  it('returns false when integrity changed but version also changed (normal upgrade)', () => {
    const diff = diffPackages(
      [pkg({ name: 'axios', version: '1.5.0', integrity: 'sha512-OLD==' })],
      [pkg({ name: 'axios', version: '1.6.0', integrity: 'sha512-NEW==' })],
      PREV_DATE,
    );
    expect(hasCriticalChanges(diff)).toBe(false);
  });

  it('returns false for clean diff', () => {
    const packages = [pkg({ name: 'lodash' })];
    const diff = diffPackages(packages, packages, PREV_DATE);
    expect(hasCriticalChanges(diff)).toBe(false);
  });
});
