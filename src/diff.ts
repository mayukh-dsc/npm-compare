import type { PackageEntry, PackageDiff, ChangedPackage } from './types.js';

export function diffPackages(
  previous: PackageEntry[],
  current: PackageEntry[],
  previousDate: string,
): PackageDiff {
  const previousMap = new Map(previous.map((p) => [p.name, p]));
  const currentMap = new Map(current.map((p) => [p.name, p]));

  const added: PackageEntry[] = [];
  const removed: PackageEntry[] = [];
  const changed: ChangedPackage[] = [];
  const unchanged: PackageEntry[] = [];

  for (const [name, currentPkg] of currentMap) {
    const previousPkg = previousMap.get(name);
    if (!previousPkg) {
      added.push(currentPkg);
      continue;
    }

    const versionChanged = previousPkg.version !== currentPkg.version;
    const integrityChanged =
      !!previousPkg.integrity &&
      !!currentPkg.integrity &&
      previousPkg.integrity !== currentPkg.integrity;
    const resolvedChanged = previousPkg.resolved !== currentPkg.resolved;

    if (versionChanged || integrityChanged || resolvedChanged) {
      changed.push({
        name,
        from: previousPkg,
        to: currentPkg,
        versionChanged,
        integrityChanged,
        resolvedChanged,
      });
    } else {
      unchanged.push(currentPkg);
    }
  }

  for (const [name, previousPkg] of previousMap) {
    if (!currentMap.has(name)) {
      removed.push(previousPkg);
    }
  }

  added.sort((a, b) => a.name.localeCompare(b.name));
  removed.sort((a, b) => a.name.localeCompare(b.name));
  changed.sort((a, b) => a.name.localeCompare(b.name));

  return {
    strategy: 'git',
    previousSnapshotDate: previousDate,
    added,
    removed,
    changed,
    unchanged,
  };
}

/** Returns true if the diff contains any critical integrity changes */
export function hasCriticalChanges(diff: PackageDiff): boolean {
  return diff.changed.some(
    (c) => c.integrityChanged && !c.versionChanged,
  );
}
