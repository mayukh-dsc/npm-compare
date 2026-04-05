import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getParentLockfilePath } from '../src/dependency-tree.js';
import { parseLockfile } from '../src/scanner.js';

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

describe('parseLockfile dependencyTrees', () => {
  it('builds production and development roots for lockfile v2', () => {
    const result = parseLockfile(path.join(fixturesDir, 'package-lock.v2.json'));
    expect(result.dependencyTrees.production.length).toBeGreaterThan(0);
    expect(result.dependencyTrees.development.length).toBeGreaterThan(0);
    const prodNames = result.dependencyTrees.production.map((n) => n.entry.name).sort();
    expect(prodNames).toContain('lodash');
    const devNames = result.dependencyTrees.development.map((n) => n.entry.name).sort();
    expect(devNames).toContain('typescript');
  });

  it('nests transitive children under v2 roots', () => {
    const result = parseLockfile(path.join(fixturesDir, 'package-lock.v2.json'));
    const lodashRoot = result.dependencyTrees.production.find((n) => n.entry.name === 'lodash');
    expect(lodashRoot).toBeDefined();
    expect(Array.isArray(lodashRoot?.children)).toBe(true);
  });
});
