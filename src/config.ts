import fs from 'node:fs';
import path from 'node:path';
import type { NpmCompareConfig, CompareStrategyName } from './types.js';

const DEFAULTS: NpmCompareConfig = {
  compare: [],
  outputDir: '.npm-compare',
  registryUrl: 'https://registry.npmjs.org',
  concurrency: 10,
  timeout: 10000,
  snapshotFile: '.npm-compare-snapshot.json',
};

interface PackageJsonNpmCompare {
  compare?: CompareStrategyName | CompareStrategyName[];
  outputDir?: string;
  registryUrl?: string;
  concurrency?: number;
  timeout?: number;
  snapshotFile?: string;
}

interface PackageJsonWithConfig {
  'npm-compare'?: PackageJsonNpmCompare;
}

export function loadConfig(projectRoot: string): NpmCompareConfig {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return { ...DEFAULTS };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as PackageJsonWithConfig;
    const userConfig = pkg['npm-compare'] ?? {};

    const compare = userConfig.compare
      ? Array.isArray(userConfig.compare)
        ? userConfig.compare
        : [userConfig.compare]
      : DEFAULTS.compare;

    return {
      ...DEFAULTS,
      ...userConfig,
      compare,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Merge CLI flags on top of file-based config. CLI flags always win. */
export function mergeCliFlags(
  base: NpmCompareConfig,
  flags: Partial<NpmCompareConfig>,
): NpmCompareConfig {
  return { ...base, ...flags };
}
