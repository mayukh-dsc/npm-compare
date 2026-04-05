export interface PackageEntry {
  name: string;
  version: string;
  integrity: string;
  resolved: string;
  dev?: boolean;
  optional?: boolean;
}

/** Nested dependency tree from the lock file (logical roots split into prod vs dev). */
export interface DependencyTreeNode {
  /** Lockfile path key (npm v2+) or synthetic path (v1). */
  pathKey: string;
  entry: PackageEntry;
  children: DependencyTreeNode[];
}

export interface DependencyTrees {
  production: DependencyTreeNode[];
  development: DependencyTreeNode[];
}

export interface Snapshot {
  generatedAt: string;
  projectName: string;
  projectVersion: string;
  nodeVersion: string;
  lockfileVersion: number;
  packages: PackageEntry[];
  /**
   * In-memory only: omitted when writing `.npm-compare-snapshot.json` to keep snapshots small.
   */
  dependencyTrees?: DependencyTrees;
}

export interface ChangedPackage {
  name: string;
  from: PackageEntry;
  to: PackageEntry;
  versionChanged: boolean;
  /** Same version, different integrity hash — strongest supply-chain attack signal */
  integrityChanged: boolean;
  resolvedChanged: boolean;
}

export interface PackageDiff {
  strategy: 'git';
  previousSnapshotDate: string;
  added: PackageEntry[];
  removed: PackageEntry[];
  changed: ChangedPackage[];
  unchanged: PackageEntry[];
}

export interface RegistryAuditEntry {
  name: string;
  version: string;
  /** From lock file (devDependency vs dependency). */
  dev?: boolean;
  lockfileIntegrity: string;
  /** null when package is not found on registry or fetch failed */
  registryIntegrity: string | null;
  lockfileResolved: string;
  /** true if resolved URL is registry.npmjs.org or registry.yarnpkg.com */
  isStandardRegistry: boolean;
  /** false = critical: tampering detected or package not on public registry */
  integrityMatch: boolean;
  latestVersion: string | null;
  isLatest: boolean | null;
  notFoundOnRegistry: boolean;
  hasInstallScript: boolean;
  /** Registry has no `dist.integrity` for this version; lock file integrity cannot be cross-checked */
  registryIntegrityMissing?: boolean;
  error?: string;
}

export interface RegistryAudit {
  strategy: 'registry';
  auditedAt: string;
  registryUrl: string;
  entries: RegistryAuditEntry[];
  criticalCount: number;
  warningCount: number;
}

export type CompareStrategyName = 'git' | 'registry';

export interface NpmCompareConfig {
  compare: CompareStrategyName[];
  outputDir: string;
  registryUrl: string;
  concurrency: number;
  timeout: number;
  snapshotFile: string;
}
