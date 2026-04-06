import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLockfileToGraph, resolveDefaultLockfile } from '../src/parse-lockfile.js';
import { parseNpmLockfileToGraph } from '../src/adapters/npm-lockfile.js';
import { parsePnpmLockfileToGraph } from '../src/adapters/pnpm-lockfile.js';
import fs from 'node:fs';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

describe('parseNpmLockfileToGraph', () => {
  it('throws when file missing', () => {
    expect(() => parseNpmLockfileToGraph('/nonexistent/path/package-lock.json')).toThrow(
      'Lock file not found',
    );
  });

  it('throws on invalid JSON', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-compare-plf-'));
    try {
      const bad = path.join(tmpDir, 'package-lock.json');
      fs.writeFileSync(bad, '{ not json', 'utf8');
      expect(() => parseNpmLockfileToGraph(bad)).toThrow('Failed to parse lock file as JSON');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('parses lockfile v2 packages into a graph', () => {
    const g = parseNpmLockfileToGraph(path.join(fixturesDir, 'package-lock.v2.json'));
    expect(g.kind).toBe('npm');
    expect(g.nodes.size).toBeGreaterThan(0);
    const lodash = [...g.nodes.values()].find((n) => n.id === 'node_modules/lodash');
    expect(lodash?.name).toBe('lodash');
    expect(lodash?.parentId).toBeNull();
  });

  it('parses lockfile v3', () => {
    const g = parseNpmLockfileToGraph(path.join(fixturesDir, 'package-lock.v3.json'));
    expect(g.lockfileVersion).toBe(3);
    expect(g.nodes.size).toBeGreaterThanOrEqual(0);
  });
});

describe('parsePnpmLockfileToGraph', () => {
  it('builds parent edges from snapshots', () => {
    const g = parsePnpmLockfileToGraph(path.join(fixturesDir, 'pnpm-lock.v9.yaml'));
    expect(g.kind).toBe('pnpm');
    const mimeTypes = g.nodes.get('mime-types@2.1.35');
    expect(mimeTypes?.parentId).toBe('accepts@1.3.8');
    const mimeDb = g.nodes.get('mime-db@1.52.0');
    expect(mimeDb?.parentId).toBe('mime-types@2.1.35');
  });
});

describe('resolveDefaultLockfile', () => {
  it('prefers pnpm-lock.yaml', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-compare-rdl-'));
    try {
      fs.writeFileSync(path.join(tmp, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n', 'utf8');
      fs.writeFileSync(path.join(tmp, 'package-lock.json'), '{}', 'utf8');
      expect(resolveDefaultLockfile(tmp).endsWith('pnpm-lock.yaml')).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('falls back to package-lock.json', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-compare-rdl2-'));
    try {
      fs.writeFileSync(path.join(tmp, 'package-lock.json'), '{"lockfileVersion":3}', 'utf8');
      expect(resolveDefaultLockfile(tmp).endsWith('package-lock.json')).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('throws when neither exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-compare-rdl3-'));
    try {
      expect(() => resolveDefaultLockfile(tmp)).toThrow('No lockfile found');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('parseLockfileToGraph', () => {
  it('dispatches by extension', () => {
    const g = parseLockfileToGraph(path.join(fixturesDir, 'pnpm-lock.v9.yaml'));
    expect(g.kind).toBe('pnpm');
    const h = parseLockfileToGraph(path.join(fixturesDir, 'package-lock.v2.json'));
    expect(h.kind).toBe('npm');
  });
});
