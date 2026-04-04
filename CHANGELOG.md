# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Default `outputDir` is `.npm-compare` so HTML reports are grouped in one directory instead of the project root.
- Git snapshot reads use `execFile` (no shell) and validate `snapshotFile` to prevent command injection.
- Lock file parsing deduplicates identical package rows that appear under multiple `node_modules` paths.
- CLI `--concurrency` / `--timeout` reject non-numeric values and clamp to safe ranges (falls back to config defaults).
- `--version` reports the version from root `package.json`.
- Registry audit warns when the published package has no `dist.integrity` but the lock file does (integrity cannot be verified).

### Added
- Initial implementation of `npm-compare generate` CLI command
- `installed` reporter: generates `npm-compare-installed.html` with all installed packages
- **Strategy B (git):** compares current packages against last git commit's snapshot via `--compare=git`
- **Strategy C (registry):** audits live integrity hashes against npm registry via `--compare=registry`
- Git diff reporter: generates `npm-compare-diff-git.html` with colour-coded package changes
- Registry audit reporter: generates `npm-compare-audit-registry.html` with integrity check results
- `npm-compare setup` command to add postinstall hook to consumer's `package.json`
- `package.json` config support via `"npm-compare"` section
- `--fail-on-critical` flag for CI integration
- Concurrency control for registry fetching (`--concurrency`)
- Self-contained HTML reports with no external CDN dependencies
- Supply-chain attack detection: flags integrity hash changes for same package version
- Non-standard registry URL detection
- Install script detection (packages with pre/post install scripts)
- Full TypeScript with strict mode
- Unit tests for all modules (vitest), plus tests for git path validation, CLI helpers, CLI entry (`setup`, `generate`, `--version`), logger, `package-version`, public API exports, shared reporter helpers, and expanded registry / git-diff / scanner edge cases
- Vitest coverage excludes `src/cli.ts` because the entry file is exercised via `dist/cli.js` in subprocess tests
- GitHub Actions CI workflow (type check, lint, test, CodeQL)
- GitHub Actions release workflow with npm provenance publishing
