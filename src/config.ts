import fs from 'node:fs';
import path from 'node:path';
import type { WhatNewPkgConfig } from './types.js';

const DEFAULTS: WhatNewPkgConfig = {
  outputDir: '.what-new-pkg',
};

interface PackageJsonWhatNewPkg {
  outputDir?: string;
}

interface PackageJsonWithConfig {
  'what-new-pkg'?: PackageJsonWhatNewPkg;
}

export function loadConfig(projectRoot: string): WhatNewPkgConfig {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return { ...DEFAULTS };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as PackageJsonWithConfig;
    const userConfig = pkg['what-new-pkg'] ?? {};

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
  base: WhatNewPkgConfig,
  flags: Partial<WhatNewPkgConfig>,
): WhatNewPkgConfig {
  return { ...base, ...flags };
}
