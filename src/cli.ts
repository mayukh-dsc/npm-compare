#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import { Command } from 'commander';
import { buildSnapshot } from './scanner.js';
import { writeSnapshot } from './snapshot.js';
import { diffPackages, hasCriticalChanges } from './diff.js';
import { loadConfig, mergeCliFlags } from './config.js';
import { isGitRepository, getGitSnapshot } from './strategies/git.js';
import { auditRegistry } from './strategies/registry.js';
import { generateInstalledHtml } from './reporter/installed.js';
import { generateGitDiffHtml } from './reporter/git-diff.js';
import { generateRegistryAuditHtml } from './reporter/registry-audit.js';
import { logger } from './logger.js';
import { PACKAGE_VERSION } from './package-version.js';
import { parsePositiveInt } from './cli-helpers.js';
import type { CompareStrategyName, NpmCompareConfig } from './types.js';

const program = new Command();

program
  .name('npm-compare')
  .description('Audit installed npm packages and detect supply-chain attacks')
  .version(PACKAGE_VERSION);

program
  .command('generate')
  .description('Scan installed packages, generate HTML reports and optionally compare')
  .option('--cwd <path>', 'Project root directory', process.env['INIT_CWD'] ?? process.cwd())
  .option('--lock-file <path>', 'Path to lock file (relative to --cwd)', 'package-lock.json')
  .option(
    '--compare <strategies>',
    'Comma-separated compare strategies: git, registry (e.g. --compare=git,registry)',
  )
  .option(
    '--output-dir <path>',
    'Output directory for HTML files (relative to --cwd; default: .npm-compare)',
  )
  .option('--concurrency <n>', 'Registry fetch concurrency', '10')
  .option('--timeout <ms>', 'Registry request timeout in ms', '10000')
  .option('--fail-on-critical', 'Exit with code 1 if critical issues are found', false)
  .action(async (opts: {
    cwd: string;
    lockFile: string;
    compare?: string;
    outputDir?: string;
    concurrency: string;
    timeout: string;
    failOnCritical: boolean;
  }) => {
    const projectRoot = path.resolve(opts.cwd);
    const fileConfig = loadConfig(projectRoot);

    const cliOverrides: Partial<NpmCompareConfig> = {};
    if (opts.compare !== undefined) {
      cliOverrides.compare = opts.compare
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is CompareStrategyName => s === 'git' || s === 'registry');
    }
    if (opts.outputDir !== undefined) cliOverrides.outputDir = opts.outputDir;
    cliOverrides.concurrency = parsePositiveInt(
      opts.concurrency,
      fileConfig.concurrency,
      1,
      100,
    );
    cliOverrides.timeout = parsePositiveInt(
      opts.timeout,
      fileConfig.timeout,
      100,
      600_000,
    );

    const config = mergeCliFlags(fileConfig, cliOverrides);
    const outputDir = path.resolve(projectRoot, config.outputDir);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const lockFilePath = path.resolve(projectRoot, opts.lockFile);

    console.log('');
    logger.section('npm-compare');
    logger.info(`Scanning ${lockFilePath}…`);

    let snapshot;
    try {
      snapshot = buildSnapshot(lockFilePath);
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    const installedPath = path.join(outputDir, 'npm-compare-installed.html');
    fs.writeFileSync(installedPath, generateInstalledHtml(snapshot), 'utf8');
    logger.success(
      `Generated: npm-compare-installed.html (${snapshot.packages.length.toLocaleString()} packages)`,
    );

    let hasCritical = false;

    if (config.compare.includes('git')) {
      logger.section('Strategy: git');

      if (!isGitRepository(projectRoot)) {
        logger.warn('Not a git repository — skipping git strategy');
      } else {
        const snapshotFilePath = path.resolve(projectRoot, config.snapshotFile);
        const snapshotFileName = path.relative(projectRoot, snapshotFilePath);
        const previousSnapshot = getGitSnapshot(snapshotFileName, projectRoot);

        if (!previousSnapshot) {
          logger.info(
            `No previous snapshot found in git HEAD (${snapshotFileName}). ` +
            `Commit the snapshot file after first run to enable comparison.`,
          );
        } else {
          const diff = diffPackages(
            previousSnapshot.packages,
            snapshot.packages,
            previousSnapshot.generatedAt,
          );

          const gitDiffPath = path.join(outputDir, 'npm-compare-diff-git.html');
          fs.writeFileSync(
            gitDiffPath,
            generateGitDiffHtml(diff, snapshot.projectName),
            'utf8',
          );

          const criticals = diff.changed.filter((c) => c.integrityChanged && !c.versionChanged);
          if (criticals.length > 0) {
            hasCritical = true;
            criticals.forEach((c) => {
              logger.critical(`${c.name}@${c.to.version} — integrity hash changed!`);
            });
          }

          logger.success(
            `Generated: npm-compare-diff-git.html` +
            ` (+${diff.added.length} -${diff.removed.length} ~${diff.changed.length})`,
          );

          if (hasCriticalChanges(diff)) {
            logger.warn('Run: git diff .npm-compare-snapshot.json to review changes');
          }
        }

        const snapshotOutPath = path.resolve(projectRoot, config.snapshotFile);
        writeSnapshot(snapshotOutPath, snapshot);
        logger.info(`Snapshot updated: ${config.snapshotFile} (commit this file)`);
      }
    }

    if (config.compare.includes('registry')) {
      logger.section('Strategy: registry');
      logger.info(
        `Auditing ${snapshot.packages.length.toLocaleString()} packages against ${config.registryUrl}…`,
      );

      let completed = 0;
      const total = snapshot.packages.length;
      const printProgress = (c: number, t: number) => {
        completed = c;
        if (process.stdout.isTTY && c % 50 === 0) {
          process.stdout.write(`\r  Fetching registry data… ${c}/${t}`);
        }
      };

      const audit = await auditRegistry(
        snapshot.packages,
        config.registryUrl,
        config.concurrency,
        config.timeout,
        printProgress,
      );

      if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(60) + '\r');

      const registryAuditPath = path.join(outputDir, 'npm-compare-audit-registry.html');
      fs.writeFileSync(
        registryAuditPath,
        generateRegistryAuditHtml(audit, snapshot.projectName, snapshot.dependencyTrees),
        'utf8',
      );

      if (audit.criticalCount > 0) {
        hasCritical = true;
        audit.entries
          .filter((e) => !e.integrityMatch && e.registryIntegrity !== null)
          .forEach((e) => {
            logger.critical(
              `${e.name}@${e.version} — lock file integrity differs from registry!`,
            );
          });
      }

      if (audit.warningCount > 0) {
        logger.warn(
          `${audit.warningCount} package(s) have warnings (non-standard registry, install scripts, not found, or missing registry integrity)`,
        );
      }

      logger.success(
        `Generated: npm-compare-audit-registry.html` +
        ` (${audit.criticalCount} critical, ${audit.warningCount} warnings, ${completed}/${total} audited)`,
      );
    }

    logger.newline();

    if (hasCritical && opts.failOnCritical) {
      logger.error('Exiting with code 1 due to critical issues (--fail-on-critical)');
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('Add npm-compare postinstall hook to the current project\'s package.json')
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

    if (pkg.scripts['postinstall']?.includes('npm-compare')) {
      logger.info('npm-compare postinstall hook is already configured.');
      return;
    }

    if (pkg.scripts['postinstall']) {
      pkg.scripts['postinstall'] += ' && npm-compare generate';
    } else {
      pkg.scripts['postinstall'] = 'npm-compare generate';
    }

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    logger.success('Added postinstall hook to package.json');
    logger.info('npm-compare generate will now run automatically on every npm install.');
  });

program.parse();
