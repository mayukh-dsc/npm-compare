export { buildDependencyTrees, getParentLockfilePath } from './dependency-tree.js';
export type { Lockfile } from './dependency-tree.js';

export { parseLockfileToGraph, parseLockfileContentToGraph, resolveDefaultLockfile } from './parse-lockfile.js';

export { parseNpmLockfileToGraph, npmLockfileJsonToGraph } from './adapters/npm-lockfile.js';
export type { NpmLockfileJson } from './adapters/npm-lockfile.js';

export { parsePnpmLockfileToGraph, pnpmPackageId, pnpmLockfileYamlToGraph } from './adapters/pnpm-lockfile.js';
export type { PnpmLockfileYaml } from './adapters/pnpm-lockfile.js';

export { diffGraphs, collectIntroducers } from './graph/diff.js';
export type { GraphDiff } from './graph/diff.js';

export type { LockfileNode, LockfileGraph, IntroducedDependency, IntroducerKind } from './graph/types.js';

export { loadConfig, mergeCliFlags } from './config.js';

export { isGitRepository, getGitLockfile, getGitFileFromHead } from './strategies/git.js';

export { generateIntroReportHtml } from './reporter/intro-report.js';

export type { PackageEntry, DependencyTreeNode, DependencyTrees, WhatNewPkgConfig } from './types.js';
