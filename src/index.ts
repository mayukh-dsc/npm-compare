export { buildDependencyTrees, getParentLockfilePath } from './dependency-tree.js';
export {
  parseLockfile,
  buildSnapshot,
  dedupeLockfilePackages,
} from './scanner.js';
export type { ParsedLockfile } from './scanner.js';

export { readSnapshot, writeSnapshot } from './snapshot.js';

export { diffPackages, hasCriticalChanges } from './diff.js';

export { loadConfig, mergeCliFlags } from './config.js';

export { isGitRepository, getGitSnapshot } from './strategies/git.js';
export { auditRegistry } from './strategies/registry.js';

export { generateInstalledHtml } from './reporter/installed.js';
export { generateGitDiffHtml } from './reporter/git-diff.js';
export { generateRegistryAuditHtml } from './reporter/registry-audit.js';

export type {
  PackageEntry,
  Snapshot,
  DependencyTreeNode,
  DependencyTrees,
  ChangedPackage,
  PackageDiff,
  RegistryAuditEntry,
  RegistryAudit,
  CompareStrategyName,
  NpmCompareConfig,
} from './types.js';
