/** Single resolved package instance in a lockfile graph (npm path or pnpm package id). */
export interface LockfileNode {
  /** Stable id: npm `packages` key (e.g. node_modules/foo); pnpm `pkg@version` from `packages`. */
  id: string;
  name: string;
  version: string;
  integrity: string;
  resolved: string;
  dev: boolean;
  optional: boolean;
  /**
   * Immediate parent in the resolved graph, or null for top-level / workspace / importer roots.
   * npm: null when parent lockfile path is the virtual root (`""`).
   */
  parentId: string | null;
  /** pnpm: same logical package can be linked from multiple parents. */
  additionalParentIds?: string[];
  /** Synthetic node for pnpm importer (not a real package). */
  isImporter?: boolean;
}

export interface LockfileGraph {
  nodes: Map<string, LockfileNode>;
  /** pnpm importer root ids (e.g. importer:.); empty for npm. */
  importerIds: string[];
  lockfileVersion: number | string;
  projectName: string;
  projectVersion: string;
  /** Which parser produced this graph. */
  kind: 'npm' | 'pnpm';
}

export type IntroducerKind = 'parent' | 'root' | 'multi';

export interface IntroducedDependency {
  child: LockfileNode;
  /** Direct introducer when unambiguous. */
  introducer: LockfileNode | null;
  introducerKind: IntroducerKind;
  /** When introducerKind is multi — all known parents in the current graph. */
  introducers?: LockfileNode[];
}
