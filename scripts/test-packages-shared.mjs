/**
 * Shared helpers for test-packages/ lockfile generators and mutators.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TEST_PACKAGES_DIR = path.join(ROOT, 'test-packages');

export const PNPM_LOCK = path.join(TEST_PACKAGES_DIR, 'pnpm-lock.yaml');
export const NPM_LOCK = path.join(TEST_PACKAGES_DIR, 'package-lock.json');
export const YARN_LOCK = path.join(TEST_PACKAGES_DIR, 'yarn.lock');

export function integrityFor(i) {
  const b64 = Buffer.from(`mock-integrity-${i}`, 'utf8').toString('base64');
  const pad = (b64 + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789').slice(0, 88);
  return `sha512-${pad}`;
}

/** Version string for mock-dep-{i} entries (matches generator output). */
export function versionForIndex(i) {
  return `1.${i}.0`;
}

/**
 * Remove the smallest mock-dep index; add two new packages after the current max index.
 * @param {number[]} indices - All present mock-dep-* numeric indices
 */
export function planMockDepMutation(indices) {
  if (!indices.length) {
    throw new Error('No mock-dep-* packages found; nothing to mutate.');
  }
  const uniq = [...new Set(indices)];
  const removeIdx = Math.min(...uniq);
  const maxIdx = Math.max(...uniq);
  return {
    removeIdx,
    addIndices: [maxIdx + 1, maxIdx + 2],
  };
}
