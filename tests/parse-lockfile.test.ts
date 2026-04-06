import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseLockfileToGraph,
  parseLockfileContentToGraph,
  resolveDefaultLockfile,
} from '../src/parse-lockfile.js';
import { parseNpmLockfileToGraph, parseNpmLockfileContentToGraph } from '../src/adapters/npm-lockfile.js';
import {
  parsePnpmLockfileToGraph,
  parsePnpmLockfileContentToGraph,
  pnpmLockfileYamlToGraph,
} from '../src/adapters/pnpm-lockfile.js';
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
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'what-new-pkg-plf-'));
    try {
      const bad = path.join(tmpDir, 'package-lock.json');
      fs.writeFileSync(bad, '{ not json', 'utf8');
      expect(() => parseNpmLockfileToGraph(bad)).toThrow('Failed to parse lock file as JSON');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('parseNpmLockfileContentToGraph throws on invalid JSON', () => {
    expect(() => parseNpmLockfileContentToGraph('{', 'label')).toThrow(
      'Failed to parse lock file as JSON: label',
    );
  });

  it('parseNpmLockfileContentToGraph parses valid JSON', () => {
    const g = parseNpmLockfileContentToGraph(
      JSON.stringify({ lockfileVersion: 3, packages: {} }),
      'head:package-lock.json',
    );
    expect(g.kind).toBe('npm');
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

  it('parses v1 lockfile with nested dependencies', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'what-new-pkg-npmv1-'));
    try {
      const lockPath = path.join(tmpDir, 'package-lock.json');
      fs.writeFileSync(
        lockPath,
        JSON.stringify({
          name: 't',
          version: '1.0.0',
          lockfileVersion: 1,
          dependencies: {
            outer: {
              version: '1.0.0',
              dependencies: {
                inner: { version: '2.0.0' },
              },
            },
          },
        }),
        'utf8',
      );
      const g = parseNpmLockfileToGraph(lockPath);
      expect(g.nodes.get('node_modules/outer/node_modules/inner')?.name).toBe('inner');
      expect(g.nodes.get('node_modules/outer/node_modules/inner')?.parentId).toBe(
        'node_modules/outer',
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
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

  it('throws when lockfile path does not exist', () => {
    expect(() => parsePnpmLockfileToGraph('/nonexistent/pnpm-lock.yaml')).toThrow('Lock file not found');
  });

  it('throws on invalid YAML', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'what-new-pkg-pnpm-bad-'));
    try {
      const p = path.join(tmp, 'pnpm-lock.yaml');
      fs.writeFileSync(p, '[', 'utf8');
      expect(() => parsePnpmLockfileToGraph(p)).toThrow('Failed to parse YAML lock file');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('parsePnpmLockfileContentToGraph throws on invalid YAML', () => {
    expect(() => parsePnpmLockfileContentToGraph('[', 'git:pnpm-lock.yaml', '/tmp')).toThrow(
      'Failed to parse YAML lock file: git:pnpm-lock.yaml',
    );
  });

  it('uses unknown project metadata when package.json is missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'what-new-pkg-pnpm-nopkg-'));
    try {
      const p = path.join(tmp, 'pnpm-lock.yaml');
      fs.writeFileSync(p, 'lockfileVersion: "9.0"\nimporters: {}\npackages: {}\n', 'utf8');
      const g = parsePnpmLockfileToGraph(p);
      expect(g.projectName).toBe('unknown');
      expect(g.projectVersion).toBe('0.0.0');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('records additional parents when a package is linked from multiple snapshots', () => {
    const g = pnpmLockfileYamlToGraph(
      {
        lockfileVersion: '9.0',
        packages: {
          'lodash@4.17.21': {},
          'pkg-a@1.0.0': {},
          'pkg-b@1.0.0': {},
        },
        snapshots: {
          'pkg-a@1.0.0': {
            dependencies: { lodash: '4.17.21' },
          },
          'pkg-b@1.0.0': {
            dependencies: { lodash: '4.17.21' },
          },
        },
      },
      't',
      '1.0.0',
    );
    const lodash = g.nodes.get('lodash@4.17.21');
    expect(lodash?.parentId).toBe('pkg-a@1.0.0');
    expect(lodash?.additionalParentIds).toContain('pkg-b@1.0.0');
  });

  it('marks devDependencies as dev in the graph', () => {
    const g = pnpmLockfileYamlToGraph(
      {
        lockfileVersion: '9.0',
        importers: {
          '.': {
            devDependencies: {
              eslint: { specifier: '^9.0.0', version: '9.0.0' },
            },
          },
        },
        packages: {
          'eslint@9.0.0': {},
        },
      },
      't',
      '1.0.0',
    );
    expect(g.nodes.get('eslint@9.0.0')?.dev).toBe(true);
  });
});

describe('resolveDefaultLockfile', () => {
  it('prefers pnpm-lock.yaml', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'what-new-pkg-rdl-'));
    try {
      fs.writeFileSync(path.join(tmp, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n', 'utf8');
      fs.writeFileSync(path.join(tmp, 'package-lock.json'), '{}', 'utf8');
      expect(resolveDefaultLockfile(tmp).endsWith('pnpm-lock.yaml')).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('falls back to package-lock.json', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'what-new-pkg-rdl2-'));
    try {
      fs.writeFileSync(path.join(tmp, 'package-lock.json'), '{"lockfileVersion":3}', 'utf8');
      expect(resolveDefaultLockfile(tmp).endsWith('package-lock.json')).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('throws when neither exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'what-new-pkg-rdl3-'));
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

describe('parseLockfileContentToGraph', () => {
  it('parses pnpm YAML from memory using relative path basename', () => {
    const yaml = fs.readFileSync(path.join(fixturesDir, 'pnpm-lock.v9.yaml'), 'utf8');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'what-new-pkg-plc-'));
    try {
      const g = parseLockfileContentToGraph(yaml, 'pnpm-lock.yaml', tmp);
      expect(g.kind).toBe('pnpm');
      expect(g.nodes.size).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('parses npm JSON from memory', () => {
    const json = fs.readFileSync(path.join(fixturesDir, 'package-lock.v2.json'), 'utf8');
    const g = parseLockfileContentToGraph(json, 'package-lock.json', '/unused');
    expect(g.kind).toBe('npm');
    expect(g.nodes.size).toBeGreaterThan(0);
  });

  it('treats arbitrary .yaml paths as pnpm', () => {
    const yaml = 'lockfileVersion: "9.0"\nimporters: {}\npackages: {}\n';
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'what-new-pkg-plc2-'));
    try {
      const g = parseLockfileContentToGraph(yaml, path.join('sub', 'foo.yaml'), tmp);
      expect(g.kind).toBe('pnpm');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
