import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseLockfile,
  buildSnapshot,
  dedupeLockfilePackages,
} from '../src/scanner.js';
import type { PackageEntry } from '../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-compare-scan-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('parseLockfile', () => {
  it('throws when lock file does not exist', () => {
    expect(() => parseLockfile('/nonexistent/path/package-lock.json')).toThrow(
      'Lock file not found',
    );
  });

  it('throws when lock file is not valid JSON', () => {
    const bad = path.join(tmpDir, 'package-lock.json');
    fs.writeFileSync(bad, '{ not json', 'utf8');
    expect(() => parseLockfile(bad)).toThrow('Failed to parse lock file as JSON');
  });

  it('returns empty packages when lockfile v3 has no packages or dependencies', () => {
    const empty = path.join(tmpDir, 'empty-lock.json');
    fs.writeFileSync(
      empty,
      JSON.stringify({ lockfileVersion: 3, name: 'solo' }),
      'utf8',
    );
    const result = parseLockfile(empty);
    expect(result.packages).toEqual([]);
    expect(result.lockfileVersion).toBe(3);
  });

  describe('lockfile v2', () => {
    const result = parseLockfile(path.join(fixturesDir, 'package-lock.v2.json'));

    it('extracts project name and version', () => {
      expect(result.projectName).toBe('my-project');
      expect(result.projectVersion).toBe('1.2.3');
      expect(result.lockfileVersion).toBe(2);
    });

    it('parses all node_modules packages', () => {
      expect(result.packages).toHaveLength(3);
    });

    it('correctly parses a production package', () => {
      const lodash = result.packages.find((p) => p.name === 'lodash');
      expect(lodash).toBeDefined();
      expect(lodash?.version).toBe('4.17.21');
      expect(lodash?.integrity).toMatch(/^sha512-/);
      expect(lodash?.resolved).toContain('registry.npmjs.org');
      expect(lodash?.dev).toBe(false);
    });

    it('correctly marks dev packages', () => {
      const ts = result.packages.find((p) => p.name === 'typescript');
      expect(ts).toBeDefined();
      expect(ts?.dev).toBe(true);
    });

    it('handles scoped packages', () => {
      const types = result.packages.find((p) => p.name === '@types/node');
      expect(types).toBeDefined();
      expect(types?.name).toBe('@types/node');
    });

    it('returns packages sorted alphabetically', () => {
      const names = result.packages.map((p) => p.name);
      expect(names).toEqual([...names].sort());
    });
  });

  describe('lockfile v3', () => {
    const result = parseLockfile(path.join(fixturesDir, 'package-lock.v3.json'));

    it('extracts project name and version', () => {
      expect(result.projectName).toBe('another-project');
      expect(result.projectVersion).toBe('2.0.0');
      expect(result.lockfileVersion).toBe(3);
    });

    it('parses packages correctly', () => {
      expect(result.packages).toHaveLength(3);
    });

    it('detects non-standard registry resolved URLs', () => {
      const privatePkg = result.packages.find((p) => p.name === 'private-pkg');
      expect(privatePkg).toBeDefined();
      expect(privatePkg?.resolved).toContain('my-artifactory.company.com');
    });
  });
});

describe('dedupeLockfilePackages', () => {
  it('removes identical duplicate rows', () => {
    const row: PackageEntry = {
      name: 'lodash',
      version: '4.17.21',
      integrity: 'sha512-abc==',
      resolved: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
      dev: false,
      optional: false,
    };
    const deduped = dedupeLockfilePackages([row, { ...row }]);
    expect(deduped).toHaveLength(1);
  });

  it('keeps rows that differ by resolved URL', () => {
    const a: PackageEntry = {
      name: 'x',
      version: '1.0.0',
      integrity: 'sha512-a==',
      resolved: 'https://a.example.com/x.tgz',
      dev: false,
    };
    const b: PackageEntry = { ...a, resolved: 'https://b.example.com/x.tgz' };
    expect(dedupeLockfilePackages([a, b])).toHaveLength(2);
  });
});

describe('buildSnapshot', () => {
  it('returns a snapshot with correct shape', () => {
    const snapshot = buildSnapshot(path.join(fixturesDir, 'package-lock.v2.json'));
    expect(snapshot).toMatchObject({
      projectName: 'my-project',
      projectVersion: '1.2.3',
      lockfileVersion: 2,
      nodeVersion: expect.stringMatching(/^v\d+/),
      generatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(snapshot.packages.length).toBeGreaterThan(0);
  });
});
