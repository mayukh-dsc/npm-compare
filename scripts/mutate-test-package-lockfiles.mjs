/**
 * In-place mutation of test-packages lockfiles: remove one mock-dep-* (smallest index),
 * add two new mock-dep-* entries (max+1, max+2). Simulates a small real lockfile change.
 *
 * Usage: node scripts/mutate-test-package-lockfiles.mjs <pnpm|npm|yarn|all>
 */

import fs from 'node:fs';
import {
  NPM_LOCK,
  PNPM_LOCK,
  TEST_PACKAGES_DIR,
  YARN_LOCK,
  integrityFor,
  planMockDepMutation,
  versionForIndex,
} from './test-packages-shared.mjs';

function collectMockDepIndicesFromKeys(keys, re) {
  const out = [];
  for (const k of keys) {
    const m = re.exec(k);
    if (m) out.push(Number(m[1]));
  }
  return out;
}

function mutateNpm() {
  if (!fs.existsSync(NPM_LOCK)) {
    throw new Error(`Missing ${NPM_LOCK}; run npm run generate:test-packages first.`);
  }
  const raw = fs.readFileSync(NPM_LOCK, 'utf8');
  const data = JSON.parse(raw);
  const root = data.packages[''];
  if (!root?.dependencies) {
    throw new Error('Invalid package-lock: missing packages[""].dependencies');
  }
  const deps = root.dependencies;
  const indices = collectMockDepIndicesFromKeys(Object.keys(deps), /^mock-dep-(\d+)$/);
  const { removeIdx, addIndices } = planMockDepMutation(indices);
  const removeName = `mock-dep-${removeIdx}`;
  const removeVer = versionForIndex(removeIdx);

  delete deps[removeName];
  const nodePath = `node_modules/${removeName}`;
  if (data.packages[nodePath]) delete data.packages[nodePath];

  for (const i of addIndices) {
    const name = `mock-dep-${i}`;
    const ver = versionForIndex(i);
    deps[name] = ver;
    data.packages[`node_modules/${name}`] = {
      version: ver,
      resolved: `https://registry.npmjs.org/${name}/-/${name}-${ver}.tgz`,
      integrity: integrityFor(i),
      license: 'MIT',
      engines: { node: '>=18' },
    };
  }

  fs.writeFileSync(NPM_LOCK, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(
    `package-lock.json: removed ${removeName}@${removeVer}; added mock-dep-${addIndices[0]}, mock-dep-${addIndices[1]}`,
  );
}

function pnpmImporterBlock(idx) {
  const ver = versionForIndex(idx);
  return `      mock-dep-${idx}:\n        specifier: ${ver}\n        version: ${ver}\n`;
}

function pnpmPackageBlock(idx) {
  const ver = versionForIndex(idx);
  const key = `mock-dep-${idx}@${ver}`;
  return `  ${key}:\n    resolution: {integrity: ${integrityFor(idx)}}\n    engines: {node: '>=18'}\n`;
}

function pnpmSnapshotLine(idx) {
  const ver = versionForIndex(idx);
  return `  mock-dep-${idx}@${ver}: {}\n`;
}

/**
 * Text-preserving edits (same layout as generate-test-package-lockfiles.mjs).
 */
function mutatePnpm() {
  if (!fs.existsSync(PNPM_LOCK)) {
    throw new Error(`Missing ${PNPM_LOCK}; run npm run generate:test-packages first.`);
  }
  let text = fs.readFileSync(PNPM_LOCK, 'utf8');
  const importerRe = /^ {6}mock-dep-(\d+):$/gm;
  const indices = [];
  let m;
  while ((m = importerRe.exec(text)) !== null) {
    indices.push(Number(m[1]));
  }
  const { removeIdx, addIndices } = planMockDepMutation(indices);
  const maxRemain = Math.max(...indices.filter((i) => i !== removeIdx));

  const impBlock = pnpmImporterBlock(removeIdx);
  if (!text.includes(impBlock)) {
    throw new Error(`pnpm: importer block for mock-dep-${removeIdx} not found (wrong format?).`);
  }
  text = text.replace(impBlock, '');

  const pkgBlock = pnpmPackageBlock(removeIdx);
  if (!text.includes(pkgBlock)) {
    throw new Error(`pnpm: packages block for mock-dep-${removeIdx} not found (wrong format?).`);
  }
  text = text.replace(pkgBlock, '');

  const snapLine = pnpmSnapshotLine(removeIdx);
  if (!text.includes(snapLine)) {
    throw new Error(`pnpm: snapshot line for mock-dep-${removeIdx} not found (wrong format?).`);
  }
  text = text.replace(snapLine, '');

  const [a, b] = addIndices;
  const anchorImp = pnpmImporterBlock(maxRemain);
  const insertImp = pnpmImporterBlock(a) + pnpmImporterBlock(b);
  const posImp = text.indexOf(anchorImp);
  if (posImp === -1) {
    throw new Error(`pnpm: could not find importer anchor mock-dep-${maxRemain}`);
  }
  text = text.slice(0, posImp + anchorImp.length) + insertImp + text.slice(posImp + anchorImp.length);

  const anchorPkg = pnpmPackageBlock(maxRemain);
  const insertPkg = pnpmPackageBlock(a) + pnpmPackageBlock(b);
  const posPkg = text.indexOf(anchorPkg);
  if (posPkg === -1) {
    throw new Error(`pnpm: could not find packages anchor mock-dep-${maxRemain}`);
  }
  text = text.slice(0, posPkg + anchorPkg.length) + insertPkg + text.slice(posPkg + anchorPkg.length);

  const anchorSnap = pnpmSnapshotLine(maxRemain);
  const insertSnap = pnpmSnapshotLine(a) + pnpmSnapshotLine(b);
  const posSnap = text.indexOf(anchorSnap);
  if (posSnap === -1) {
    throw new Error(`pnpm: could not find snapshot anchor mock-dep-${maxRemain}`);
  }
  text = text.slice(0, posSnap + anchorSnap.length) + insertSnap + text.slice(posSnap + anchorSnap.length);

  fs.writeFileSync(PNPM_LOCK, text, 'utf8');
  console.log(
    `pnpm-lock.yaml: removed mock-dep-${removeIdx}@${versionForIndex(removeIdx)}; added mock-dep-${a}, mock-dep-${b}`,
  );
}

function yarnBlockLines(i) {
  const name = `mock-dep-${i}`;
  const ver = versionForIndex(i);
  return [
    `${name}@${ver}:`,
    `  version "${ver}"`,
    `  resolved "https://registry.npmjs.org/${name}/-/${name}-${ver}.tgz"`,
    `  integrity ${integrityFor(i)}`,
  ];
}

function parseYarnLock(content) {
  const lines = content.split('\n');
  let i = 0;
  const header = [];
  while (i < lines.length && !/^mock-dep-\d+@/.test(lines[i])) {
    header.push(lines[i]);
    i++;
  }
  /** @type {Map<number, string[]>} */
  const blocks = new Map();
  while (i < lines.length) {
    const m = /^mock-dep-(\d+)@(1\.\d+\.0):$/.exec(lines[i]);
    if (!m) {
      i++;
      continue;
    }
    const idx = Number(m[1]);
    const start = i;
    i++;
    while (i < lines.length && lines[i].startsWith('  ')) {
      i++;
    }
    blocks.set(idx, lines.slice(start, i));
    while (i < lines.length && lines[i] === '') {
      i++;
    }
  }
  return { header, blocks };
}

function mutateYarn() {
  if (!fs.existsSync(YARN_LOCK)) {
    throw new Error(`Missing ${YARN_LOCK}; run npm run generate:test-packages first.`);
  }
  const raw = fs.readFileSync(YARN_LOCK, 'utf8');
  const { header, blocks } = parseYarnLock(raw);
  const indices = [...blocks.keys()].sort((a, b) => a - b);
  const { removeIdx, addIndices } = planMockDepMutation(indices);

  blocks.delete(removeIdx);
  for (const i of addIndices) {
    blocks.set(i, yarnBlockLines(i));
  }

  const sorted = [...blocks.keys()].sort((a, b) => a - b);
  const body = sorted.map((k) => blocks.get(k).join('\n')).join('\n\n');
  const headText = header.join('\n');
  const out = headText + (headText.length ? '\n' : '') + body + '\n';
  fs.writeFileSync(YARN_LOCK, out, 'utf8');
  console.log(
    `yarn.lock: removed mock-dep-${removeIdx}@${versionForIndex(removeIdx)}; added mock-dep-${addIndices[0]}, mock-dep-${addIndices[1]}`,
  );
}

function main() {
  const arg = (process.argv[2] || 'all').toLowerCase();
  if (!fs.existsSync(TEST_PACKAGES_DIR)) {
    throw new Error(`Missing ${TEST_PACKAGES_DIR}; run npm run generate:test-packages first.`);
  }
  const runners = {
    pnpm: mutatePnpm,
    npm: mutateNpm,
    yarn: mutateYarn,
  };
  if (arg === 'all') {
    mutatePnpm();
    mutateNpm();
    mutateYarn();
    return;
  }
  const fn = runners[arg];
  if (!fn) {
    console.error('Usage: node scripts/mutate-test-package-lockfiles.mjs <pnpm|npm|yarn|all>');
    process.exit(1);
  }
  fn();
}

main();
