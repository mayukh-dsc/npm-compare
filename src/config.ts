import fs from 'node:fs';
import path from 'node:path';
import type { NpmCompareConfig } from './types.js';

const DEFAULTS: NpmCompareConfig = {
  outputDir: '.npm-compare',
};

interface PackageJsonNpmCompare {
  outputDir?: string;
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

    return {
      ...DEFAULTS,
      ...userConfig,
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
