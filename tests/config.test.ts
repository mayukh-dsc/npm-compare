import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, mergeCliFlags } from '../src/config.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'what-new-pkg-config-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('returns defaults when no package.json exists', () => {
    const config = loadConfig(path.join(tmpDir, 'nonexistent'));
    expect(config.outputDir).toBe('.what-new-pkg');
  });

  it('returns defaults when package.json has no what-new-pkg section', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' }),
      'utf8',
    );
    const config = loadConfig(tmpDir);
    expect(config.outputDir).toBe('.what-new-pkg');
  });

  it('overrides outputDir from config', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        'what-new-pkg': { outputDir: '.reports' },
      }),
      'utf8',
    );
    const config = loadConfig(tmpDir);
    expect(config.outputDir).toBe('.reports');
  });

  it('returns defaults when package.json contains invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{ invalid }', 'utf8');
    const config = loadConfig(tmpDir);
    expect(config.outputDir).toBe('.what-new-pkg');
  });
});

describe('mergeCliFlags', () => {
  it('CLI flags override file config', () => {
    const base = loadConfig(path.join(tmpDir, 'nonexistent'));
    const merged = mergeCliFlags(base, { outputDir: 'out' });
    expect(merged.outputDir).toBe('out');
  });

  it('preserves base config for unset CLI flags', () => {
    const base = loadConfig(path.join(tmpDir, 'nonexistent'));
    const merged = mergeCliFlags(base, {});
    expect(merged.outputDir).toBe('.what-new-pkg');
  });
});
