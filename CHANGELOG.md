# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **npm logical introducers** for hoisted packages: `package-lock.json` dependency declarations are matched with `semver` so transitive deps lifted to the root still show **Introduced by** the declaring package (`src/adapters/npm-logical-deps.ts`, `semver` dependency).
- **`pnpm-lock.yaml` support** via a YAML parser (`yaml` dependency) and `src/adapters/pnpm-lockfile.ts`.
- **Canonical `LockfileGraph`** (`src/graph/types.ts`) with stable node ids and parent edges for introducer attribution.
- **Single HTML report** `.what-new-pkg/what-new-pkg.html` listing newly introduced packages and **Introduced by** (parent in the resolved graph, or workspace root when hoisted; multiple parents when deduped).
- **`parseLockfileToGraph`**, **`parseLockfileContentToGraph`**, **`resolveDefaultLockfile`** (prefer `pnpm-lock.yaml`, then `package-lock.json`).
- Git baseline via **`getGitLockfile`** / **`getGitFileFromHead`**: raw lockfile at `HEAD` instead of a sidecar JSON file.

### Removed (breaking)

- **`.what-new-pkg-snapshot.json`** — comparison baseline is the committed lockfile at git `HEAD` only.
- **Registry audit**, **installed inventory**, and **legacy git flat diff** HTML reporters and **`auditRegistry`**.
- CLI flags **`--compare`**, **`--concurrency`**, **`--timeout`**, **`--fail-on-critical`**, and config keys **`snapshotFile`**, **`compare`**, **`registryUrl`**, etc.

### Changed

- **Project and npm package** renamed from `npm-compare` to **`what-new-pkg`**: CLI binary, default output dir (`.what-new-pkg`), report file (`what-new-pkg.html`), and `package.json` config key (`"what-new-pkg"`). Public config type renamed to **`WhatNewPkgConfig`**.
- **npm lockfile** parsing now builds a **graph** (`src/adapters/npm-lockfile.ts`); diff is **by lockfile node id**, not by package name alone.
- Public API exports updated (see `src/index.ts`).

## [0.1.0] — prior release

Earlier releases documented installed/registry/git snapshot behaviour; see git history for details.
