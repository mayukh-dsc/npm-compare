# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.2] — 2026-04-09

### Fixed

- **`git show` baseline for large lockfiles:** `execFileSync` used Node’s default **1 MiB** stdout buffer, so multi‑megabyte lockfiles failed with **`ENOBUFS`**, the baseline was dropped, and diffs incorrectly showed **0 introduced / 0 removed**. The git read now uses a **64 MiB** buffer.

## [0.2.0] — 2026-04-07

### Added

- **`demo` subcommand** with bundled sample lockfile data (`src/demo-report-data.ts`) for trying the HTML report without a real project.
- **Richer HTML report** layout and content in `intro-report` (tables, styling, and related tests).

### Changed

- **CLI** uses Node’s **`util.parseArgs`** instead of **`commander`**; **`commander`** removed from dependencies. **`engines.node`** is now **`>=18.3.0`** (`parseArgs` availability).
- Small **graph diff** / public export adjustments tied to the report work.

## [0.1.0] — 2026-04-06

First release under the **`what-new-pkg`** name (renamed from **`npm-compare`**). This version already uses the **lockfile-at-`HEAD`** baseline and graph-based diff below; those changes shipped in the same refactor series **before** the rename, not in **0.2.0**.

### Added

- **`pnpm-lock.yaml` support** via a YAML parser (`yaml` dependency) and `src/adapters/pnpm-lockfile.ts`.
- **Canonical `LockfileGraph`** (`src/graph/types.ts`) with stable node ids and parent edges for introducer attribution.
- **Single HTML report** `.what-new-pkg/what-new-pkg.html` listing newly introduced packages and **Introduced by** (parent in the resolved graph, or workspace root when hoisted; multiple parents when deduped).
- **`parseLockfileToGraph`**, **`parseLockfileContentToGraph`**, **`resolveDefaultLockfile`** (prefer `pnpm-lock.yaml`, then `package-lock.json`).
- Git baseline via **`getGitLockfile`** / **`getGitFileFromHead`**: raw lockfile at `HEAD` instead of a sidecar JSON snapshot file.

### Removed (breaking)

Migrating from **`npm-compare`** (or earlier git history):

- **Sidecar snapshot JSON** workflow — comparison baseline is the committed lockfile at git **`HEAD`** only (no separate snapshot file to generate or compare).
- **Registry audit**, **installed inventory**, and **legacy git flat diff** HTML reporters and **`auditRegistry`**.
- CLI flags **`--compare`**, **`--concurrency`**, **`--timeout`**, **`--fail-on-critical`**, and config keys **`snapshotFile`**, **`compare`**, **`registryUrl`**, etc.

### Changed

- **Project and npm package** renamed from `npm-compare` to **`what-new-pkg`**: CLI binary, default output dir (`.what-new-pkg`), report file (`what-new-pkg.html`), and `package.json` config key (`"what-new-pkg"`). Public config type renamed to **`WhatNewPkgConfig`**.
- **npm lockfile** parsing now builds a **graph** (`src/adapters/npm-lockfile.ts`); diff is **by lockfile node id**, not by package name alone.
- Public API exports updated (see `src/index.ts`).
