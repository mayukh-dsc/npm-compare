#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { parseLockfileToGraph, parseLockfileContentToGraph, resolveDefaultLockfile } from './parse-lockfile.js';
import { diffGraphs } from './graph/diff.js';
import { loadConfig, mergeCliFlags } from './config.js';
import { isGitRepository, getGitLockfile } from './strategies/git.js';
import { generateIntroReportHtml } from './reporter/intro-report.js';
import { logger } from './logger.js';
import { PACKAGE_VERSION } from './package-version.js';
import type { LockfileGraph } from './graph/types.js';
import type { WhatNewPkgConfig } from './types.js';

function printGlobalHelp(): void {
  console.log(`Usage: what-new-pkg <command> [options]

Compare lockfiles against git HEAD and report newly introduced dependencies.

Commands:
  generate    Scan the lockfile and write what-new-pkg.html (introduced packages vs git HEAD)
  setup       Add what-new-pkg postinstall hook to the current project's package.json

Options:
  -V, --version   Print version
  -h, --help      Print help
`);
}

function printGenerateHelp(): void {
  console.log(`Usage: what-new-pkg generate [options]

Options:
  --cwd <path>           Project root directory (default: INIT_CWD or cwd)
  --lock-file <path>     Path to lock file relative to --cwd
  --output-dir <path>    Output directory for HTML (relative to --cwd)
  -h, --help             Print help
`);
}

function printSetupHelp(): void {
  console.log(`Usage: what-new-pkg setup [options]

Options:
  --cwd <path>    Project root directory (default: cwd)
  -h, --help      Print help
`);
}

function defaultCwd(): string {
  return process.env['INIT_CWD'] ?? process.cwd();
}

interface GenerateOpts {
  cwd: string;
  'lock-file'?: string;
  'output-dir'?: string;
}

function loadGitBaseline(
  projectRoot: string,
  lockFileRelative: string,
): {
  previous: LockfileGraph | null;
  baselineReason: string | null;
  hasGitBaseline: boolean;
} {
  if (!isGitRepository(projectRoot)) {
    return {
      previous: null,
      baselineReason: 'Not a git repository — comparison against HEAD was skipped.',
      hasGitBaseline: false,
    };
  }

  const headContent = getGitLockfile(lockFileRelative, projectRoot);
  if (headContent === null) {
    return {
      previous: null,
      baselineReason: `No committed lockfile at HEAD (${lockFileRelative}). Commit the lockfile to enable comparison.`,
      hasGitBaseline: false,
    };
  }

  try {
    const previous = parseLockfileContentToGraph(headContent, lockFileRelative, projectRoot);
    return { previous, baselineReason: null, hasGitBaseline: true };
  } catch (err) {
    return {
      previous: null,
      baselineReason:
        (err instanceof Error ? err.message : String(err)) +
        ' — baseline from HEAD could not be parsed.',
      hasGitBaseline: false,
    };
  }
}

function runGenerateAction(values: GenerateOpts): void {
  const projectRoot = path.resolve(values.cwd);
  const fileConfig = loadConfig(projectRoot);

  const cliOverrides: Partial<WhatNewPkgConfig> = {};
  if (values['output-dir'] !== undefined) cliOverrides.outputDir = values['output-dir'];
  const config = mergeCliFlags(fileConfig, cliOverrides);
  const outputDir = path.resolve(projectRoot, config.outputDir);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let lockFilePath: string;
  try {
    lockFilePath = values['lock-file']
      ? path.resolve(projectRoot, values['lock-file'])
      : resolveDefaultLockfile(projectRoot);
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const lockFileRelative = path.relative(projectRoot, lockFilePath);
  if (lockFileRelative.startsWith('..') || path.isAbsolute(lockFileRelative)) {
    logger.error('Lock file must be inside the project root.');
    process.exit(1);
  }

  console.log('');
  logger.section('what-new-pkg');
  logger.info(`Scanning ${lockFilePath}…`);

  let graph: LockfileGraph;
  try {
    graph = parseLockfileToGraph(lockFilePath);
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const { previous, baselineReason, hasGitBaseline } = loadGitBaseline(projectRoot, lockFileRelative);

  const graphDiff = diffGraphs(previous, graph);

  const generatedAt = new Date().toISOString();
  const html = generateIntroReportHtml(
    graph.projectName,
    lockFileRelative,
    graph,
    graphDiff,
    {
      generatedAt,
      hasGitBaseline,
      baselineReason,
    },
  );

  const outPath = path.join(outputDir, 'what-new-pkg.html');
  fs.writeFileSync(outPath, html, 'utf8');

  logger.success(
    `Generated: ${path.relative(projectRoot, outPath)} (${graphDiff.introduced.length} introduced, ${graphDiff.removed.length} removed)`,
  );
  logger.newline();
}

function runGenerate(rawArgs: string[]): void {
  let values: {
    cwd?: string;
    'lock-file'?: string;
    'output-dir'?: string;
    help?: boolean;
  };
  try {
    const parsed = parseArgs({
      args: rawArgs,
      options: {
        cwd: { type: 'string', default: defaultCwd() },
        'lock-file': { type: 'string' },
        'output-dir': { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
      allowPositionals: true,
      strict: true,
    });
    values = parsed.values;
    if (parsed.positionals.length > 0) {
      logger.error(`Unexpected arguments: ${parsed.positionals.join(' ')}`);
      printGenerateHelp();
      process.exit(1);
    }
  } catch (e) {
    logger.error(e instanceof Error ? e.message : String(e));
    printGenerateHelp();
    process.exit(1);
  }

  if (values.help) {
    printGenerateHelp();
    process.exit(0);
  }

  runGenerateAction({
    cwd: values.cwd!,
    'lock-file': values['lock-file'],
    'output-dir': values['output-dir'],
  });
}

function runSetup(rawArgs: string[]): void {
  let values: { cwd?: string; help?: boolean };
  try {
    const parsed = parseArgs({
      args: rawArgs,
      options: {
        cwd: { type: 'string', default: process.cwd() },
        help: { type: 'boolean', short: 'h' },
      },
      allowPositionals: true,
      strict: true,
    });
    values = parsed.values;
    if (parsed.positionals.length > 0) {
      logger.error(`Unexpected arguments: ${parsed.positionals.join(' ')}`);
      printSetupHelp();
      process.exit(1);
    }
  } catch (e) {
    logger.error(e instanceof Error ? e.message : String(e));
    printSetupHelp();
    process.exit(1);
  }

  if (values.help) {
    printSetupHelp();
    process.exit(0);
  }

  const pkgPath = path.resolve(values.cwd!, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    logger.error(`No package.json found at ${pkgPath}`);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
    scripts?: Record<string, string>;
  };
  pkg.scripts = pkg.scripts ?? {};

  if (pkg.scripts['postinstall']?.includes('what-new-pkg')) {
    logger.info('what-new-pkg postinstall hook is already configured.');
    return;
  }

  if (pkg.scripts['postinstall']) {
    pkg.scripts['postinstall'] += ' && what-new-pkg generate';
  } else {
    pkg.scripts['postinstall'] = 'what-new-pkg generate';
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  logger.success('Added postinstall hook to package.json');
  logger.info('what-new-pkg generate will now run automatically on every install.');
}

function main(): void {
  const argv = process.argv.slice(2);

  if (argv[0] === '--help' || argv[0] === '-h') {
    printGlobalHelp();
    process.exit(0);
  }
  if (argv[0] === '--version' || argv[0] === '-V') {
    console.log(PACKAGE_VERSION);
    process.exit(0);
  }

  if (argv.length === 0) {
    printGlobalHelp();
    process.exit(1);
  }

  const cmd = argv[0];
  const rest = argv.slice(1);

  if (cmd === 'generate') {
    runGenerate(rest);
    return;
  }
  if (cmd === 'setup') {
    runSetup(rest);
    return;
  }

  logger.error(`Unknown command: ${cmd}`);
  printGlobalHelp();
  process.exit(1);
}

main();
