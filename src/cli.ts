#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import { Command } from 'commander';
import { parseLockfileToGraph, parseLockfileContentToGraph, resolveDefaultLockfile } from './parse-lockfile.js';
import { diffGraphs } from './graph/diff.js';
import { loadConfig, mergeCliFlags } from './config.js';
import { isGitRepository, getGitLockfile } from './strategies/git.js';
import { generateIntroReportHtml } from './reporter/intro-report.js';
import { logger } from './logger.js';
import { PACKAGE_VERSION } from './package-version.js';
import type { LockfileGraph } from './graph/types.js';
import type { WhatNewPkgConfig } from './types.js';

const program = new Command();

program
  .name('what-new-pkg')
  .description('Compare lockfiles against git HEAD and report newly introduced dependencies')
  .version(PACKAGE_VERSION);

program
  .command('generate')
  .description('Scan the lockfile and write what-new-pkg.html (introduced packages vs git HEAD)')
  .option('--cwd <path>', 'Project root directory', process.env['INIT_CWD'] ?? process.cwd())
  .option(
    '--lock-file <path>',
    'Path to lock file relative to --cwd (default: pnpm-lock.yaml or package-lock.json)',
  )
  .option(
    '--output-dir <path>',
    'Output directory for HTML (relative to --cwd; default: .what-new-pkg)',
  )
  .action((opts: { cwd: string; lockFile?: string; outputDir?: string }) => {
    const projectRoot = path.resolve(opts.cwd);
    const fileConfig = loadConfig(projectRoot);

    const cliOverrides: Partial<WhatNewPkgConfig> = {};
    if (opts.outputDir !== undefined) cliOverrides.outputDir = opts.outputDir;
    const config = mergeCliFlags(fileConfig, cliOverrides);
    const outputDir = path.resolve(projectRoot, config.outputDir);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let lockFilePath: string;
    try {
      lockFilePath = opts.lockFile
        ? path.resolve(projectRoot, opts.lockFile)
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

    let previous: LockfileGraph | null = null;
    let baselineReason: string | null = null;
    let hasGitBaseline = false;

    if (isGitRepository(projectRoot)) {
      const headContent = getGitLockfile(lockFileRelative, projectRoot);
      if (headContent === null) {
        baselineReason = `No committed lockfile at HEAD (${lockFileRelative}). Commit the lockfile to enable comparison.`;
      } else {
        try {
          previous = parseLockfileContentToGraph(headContent, lockFileRelative, projectRoot);
          hasGitBaseline = true;
        } catch (err) {
          baselineReason =
            (err instanceof Error ? err.message : String(err)) +
            ' — baseline from HEAD could not be parsed.';
        }
      }
    } else {
      baselineReason = 'Not a git repository — comparison against HEAD was skipped.';
    }

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
  });

program
  .command('setup')
  .description('Add what-new-pkg postinstall hook to the current project\'s package.json')
  .option('--cwd <path>', 'Project root directory', process.cwd())
  .action((opts: { cwd: string }) => {
    const pkgPath = path.resolve(opts.cwd, 'package.json');
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
  });

program.parse();
