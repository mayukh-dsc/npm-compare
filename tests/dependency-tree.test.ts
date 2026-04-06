import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getParentLockfilePath, buildDependencyTrees, type Lockfile } from '../src/dependency-tree.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

describe('getParentLockfilePath', () => {
  it('returns empty string for top-level node_modules key', () => {
    expect(getParentLockfilePath('node_modules/lodash')).toBe('');
  });

  it('returns null for empty key or bare node_modules', () => {
    expect(getParentLockfilePath('')).toBeNull();
    expect(getParentLockfilePath('node_modules')).toBeNull();
  });

  it('returns parent path for nested packages', () => {
    expect(getParentLockfilePath('node_modules/a/node_modules/b')).toBe('node_modules/a');
  });

  it('handles scoped packages', () => {
    expect(getParentLockfilePath('node_modules/@scope/pkg/node_modules/dep')).toBe(
      'node_modules/@scope/pkg',
    );
  });
});

describe('buildDependencyTrees', () => {
  it('builds production and development roots for lockfile v2', () => {
    const raw = fs.readFileSync(path.join(fixturesDir, 'package-lock.v2.json'), 'utf8');
    const lockfile = JSON.parse(raw) as Lockfile;
    const trees = buildDependencyTrees(lockfile, lockfile.lockfileVersion ?? 2);
    expect(trees.production.length).toBeGreaterThan(0);
    expect(trees.development.length).toBeGreaterThan(0);
    const prodNames = trees.production.map((n) => n.entry.name).sort();
    expect(prodNames).toContain('lodash');
    const devNames = trees.development.map((n) => n.entry.name).sort();
    expect(devNames).toContain('typescript');
  });

  it('nests transitive children under v2 roots', () => {
    const raw = fs.readFileSync(path.join(fixturesDir, 'package-lock.v2.json'), 'utf8');
    const lockfile = JSON.parse(raw) as Lockfile;
    const trees = buildDependencyTrees(lockfile, lockfile.lockfileVersion ?? 2);
    const lodashRoot = trees.production.find((n) => n.entry.name === 'lodash');
    expect(lodashRoot).toBeDefined();
    expect(Array.isArray(lodashRoot?.children)).toBe(true);
  });

  it('attaches nested v2 packages under their parent path', () => {
    const lockfile: Lockfile = {
      lockfileVersion: 3,
      packages: {
        'node_modules/parent-pkg': { version: '1.0.0' },
        'node_modules/parent-pkg/node_modules/child-pkg': { version: '2.0.0' },
      },
    };
    const trees = buildDependencyTrees(lockfile, 3);
    const parent = [...trees.production, ...trees.development].find(
      (n) => n.entry.name === 'parent-pkg',
    );
    expect(parent?.children.some((c) => c.entry.name === 'child-pkg')).toBe(true);
  });

  it('builds v1-only lockfiles', () => {
    const lockfile: Lockfile = {
      lockfileVersion: 1,
      dependencies: {
        lodash: { version: '4.17.21' },
      },
    };
    const trees = buildDependencyTrees(lockfile, 1);
    expect(trees.production.map((n) => n.entry.name)).toContain('lodash');
  });

  it('returns empty trees when there are no dependency entries', () => {
    const lockfile: Lockfile = { lockfileVersion: 3 };
    const trees = buildDependencyTrees(lockfile, 3);
    expect(trees.production).toEqual([]);
    expect(trees.development).toEqual([]);
  });
});
