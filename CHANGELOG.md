# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Default `outputDir` is `.npm-compare` so HTML reports are grouped in one directory instead of the project root.

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
- Unit tests for all modules (vitest)
- GitHub Actions CI workflow (type check, lint, test, CodeQL)
- GitHub Actions release workflow with npm provenance publishing
