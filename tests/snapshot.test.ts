import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readSnapshot, writeSnapshot } from '../src/snapshot.js';
import type { Snapshot } from '../src/types.js';

const makeSnapshot = (): Snapshot => ({
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
  ],
});

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-compare-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('readSnapshot', () => {
  it('returns null when file does not exist', () => {
    const result = readSnapshot(path.join(tmpDir, 'nonexistent.json'));
    expect(result).toBeNull();
  });

  it('returns null when file contains invalid JSON', () => {
    const filePath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(filePath, '{ invalid json }', 'utf8');
    const result = readSnapshot(filePath);
    expect(result).toBeNull();
  });

  it('reads and parses a valid snapshot', () => {
    const snapshot = makeSnapshot();
    const filePath = path.join(tmpDir, 'snapshot.json');
    fs.writeFileSync(filePath, JSON.stringify(snapshot), 'utf8');

    const result = readSnapshot(filePath);
    expect(result).toEqual(snapshot);
  });
});

describe('writeSnapshot', () => {
  it('writes snapshot as formatted JSON', () => {
    const snapshot = makeSnapshot();
    const filePath = path.join(tmpDir, '.npm-compare-snapshot.json');

    writeSnapshot(filePath, snapshot);

    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('\n');
    expect(content.endsWith('\n')).toBe(true);
  });

  it('round-trips correctly: write then read', () => {
    const snapshot = makeSnapshot();
    const filePath = path.join(tmpDir, '.npm-compare-snapshot.json');

    writeSnapshot(filePath, snapshot);
    const result = readSnapshot(filePath);

    expect(result).toEqual(snapshot);
  });

  it('does not persist dependencyTrees (in-memory only)', () => {
    const snapshot: Snapshot = {
      ...makeSnapshot(),
      dependencyTrees: {
        production: [],
        development: [],
      },
    };
    const filePath = path.join(tmpDir, 'with-trees.json');
    writeSnapshot(filePath, snapshot);
    const result = readSnapshot(filePath);
    expect(result?.dependencyTrees).toBeUndefined();
    expect(result).toEqual(makeSnapshot());
  });
});
