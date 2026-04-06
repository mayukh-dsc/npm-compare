import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

beforeAll(() => {
  execFileSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'pipe' });
});

const cliJs = path.join(repoRoot, 'dist/cli.js');

function runCli(args: string[], cwd: string): string {
  return execFileSync(process.execPath, [cliJs, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
}

describe('cli', () => {
  it('--version matches package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
      version: string;
    };
    const out = runCli(['--version'], repoRoot);
    expect(out.trim()).toBe(pkg.version);
  });

  it('setup adds postinstall hook', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'what-new-pkg-cli-'));
    try {
      fs.writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ name: 'cli-test-pkg', version: '1.0.0', scripts: {} }, null, 2),
        'utf8',
      );
      runCli(['setup', '--cwd', tmp], repoRoot);
      const pkg = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8')) as {
        scripts: Record<string, string>;
      };
      expect(pkg.scripts['postinstall']).toContain('what-new-pkg generate');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('generate writes what-new-pkg.html', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'what-new-pkg-gen-'));
    try {
      const fixture = path.join(repoRoot, 'tests/fixtures/package-lock.v2.json');
      fs.copyFileSync(fixture, path.join(tmp, 'package-lock.json'));
      fs.writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ name: 'gen-test', version: '1.0.0' }),
        'utf8',
      );
      runCli(['generate', '--cwd', tmp], tmp);
      const html = path.join(tmp, '.what-new-pkg', 'what-new-pkg.html');
      expect(fs.existsSync(html)).toBe(true);
      expect(fs.readFileSync(html, 'utf8')).toContain('Newly introduced dependencies');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
