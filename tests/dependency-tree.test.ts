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
});
