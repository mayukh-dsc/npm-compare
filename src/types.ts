/** @deprecated Legacy flat entry; prefer LockfileNode in graph/types. */
export interface PackageEntry {
  name: string;
  version: string;
  integrity: string;
  resolved: string;
  dev?: boolean;
  optional?: boolean;
}

/** Nested dependency tree from the lock file (npm only; optional tooling). */
export interface DependencyTreeNode {
  pathKey: string;
  entry: PackageEntry;
  children: DependencyTreeNode[];
}

export interface DependencyTrees {
  production: DependencyTreeNode[];
  development: DependencyTreeNode[];
}

export interface WhatNewPkgConfig {
  outputDir: string;
}
