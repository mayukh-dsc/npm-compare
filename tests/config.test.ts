import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, mergeCliFlags } from '../src/config.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-compare-config-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('returns defaults when no package.json exists', () => {
    const config = loadConfig(path.join(tmpDir, 'nonexistent'));
    expect(config.compare).toEqual([]);
    expect(config.registryUrl).toBe('https://registry.npmjs.org');
    expect(config.concurrency).toBe(10);
    expect(config.timeout).toBe(10000);
    expect(config.snapshotFile).toBe('.npm-compare-snapshot.json');
    expect(config.outputDir).toBe('.npm-compare');
  });

  it('returns defaults when package.json has no npm-compare section', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' }),
      'utf8',
    );
    const config = loadConfig(tmpDir);
    expect(config.compare).toEqual([]);
  });

  it('loads compare as array from config', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        'npm-compare': { compare: ['git', 'registry'] },
      }),
      'utf8',
    );
    const config = loadConfig(tmpDir);
    expect(config.compare).toEqual(['git', 'registry']);
  });

  it('coerces compare string to array', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        'npm-compare': { compare: 'git' },
      }),
      'utf8',
    );
    const config = loadConfig(tmpDir);
    expect(config.compare).toEqual(['git']);
  });

  it('overrides individual fields from config', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        'npm-compare': {
          registryUrl: 'https://my-registry.com',
          concurrency: 5,
          outputDir: '.reports',
        },
      }),
      'utf8',
    );
    const config = loadConfig(tmpDir);
    expect(config.registryUrl).toBe('https://my-registry.com');
    expect(config.concurrency).toBe(5);
    expect(config.outputDir).toBe('.reports');
  });

  it('returns defaults when package.json contains invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{ invalid }', 'utf8');
    const config = loadConfig(tmpDir);
    expect(config.compare).toEqual([]);
  });
});

describe('mergeCliFlags', () => {
  it('CLI flags override file config', () => {
    const base = loadConfig(path.join(tmpDir, 'nonexistent'));
    const merged = mergeCliFlags(base, { compare: ['registry'], concurrency: 20 });
    expect(merged.compare).toEqual(['registry']);
    expect(merged.concurrency).toBe(20);
  });

  it('preserves base config for unset CLI flags', () => {
    const base = loadConfig(path.join(tmpDir, 'nonexistent'));
    const merged = mergeCliFlags(base, { concurrency: 20 });
    expect(merged.registryUrl).toBe('https://registry.npmjs.org');
    expect(merged.snapshotFile).toBe('.npm-compare-snapshot.json');
    expect(merged.outputDir).toBe('.npm-compare');
  });
});
