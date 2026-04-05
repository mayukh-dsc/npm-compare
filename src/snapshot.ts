import fs from 'node:fs';
import type { Snapshot } from './types.js';

export function readSnapshot(snapshotPath: string): Snapshot | null {
  if (!fs.existsSync(snapshotPath)) {
    return null;
  }

  const content = fs.readFileSync(snapshotPath, 'utf8');
  try {
    return JSON.parse(content) as Snapshot;
  } catch {
    return null;
  }
}

export function writeSnapshot(snapshotPath: string, snapshot: Snapshot): void {
  const persisted = { ...snapshot };
  delete persisted.dependencyTrees;
  fs.writeFileSync(snapshotPath, JSON.stringify(persisted, null, 2) + '\n', 'utf8');
}
