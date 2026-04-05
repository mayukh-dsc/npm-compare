import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Package version from the root `package.json` (resolved at runtime from `dist/` or `src/`). */
export const PACKAGE_VERSION: string = (
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as {
    version: string;
  }
).version;
