# npm-compare

> A minimalistic, open-source tool that **compares your lockfile to the last committed version in git** and reports **newly introduced dependencies**, with **who depends on whom** in the resolved graph (npm or pnpm).

[CI](https://github.com/mayukh-dsc/npm-compare/actions/workflows/ci.yml)
[npm version](https://www.npmjs.com/package/npm-compare)
[License: MIT](https://opensource.org/licenses/MIT)
[npm provenance](https://docs.npmjs.com/generating-provenance-statements)

---

## Why?

After an install or upgrade, you often need to answer: **which package pulled in this new transitive dependency?** `npm-compare` diffs the **current** lockfile against **`git show HEAD:<lockfile>`** and lists each **new** resolved package with its **immediate dependent** (or workspace root when hoisted).

---

## Install

```bash
npm install --save-dev npm-compare
```

Then add the postinstall hook (or run `npm-compare setup`):

```json
{
  "scripts": {
    "postinstall": "npm-compare generate"
  }
}
```

Or:

```bash
npx npm-compare setup
```

---

## Usage

```bash
# Auto-detect lockfile: pnpm-lock.yaml if present, else package-lock.json
npm-compare generate

# Explicit lockfile path (relative to project root)
npm-compare generate --lock-file package-lock.json

# Output directory (default: .npm-compare)
npm-compare generate --output-dir .npm-compare
```

### Baseline

Comparison uses the **same lockfile path** committed at **git `HEAD`**. Commit your lockfile so the tool has a baseline. If the file is missing from `HEAD` or the project is not a git repository, the report explains that and shows no introduced rows (no crash).

### Monorepos

Run once per **package root** that owns a lockfile (e.g. workspace root with a single `pnpm-lock.yaml` or `package-lock.json`).

---

## Output

By default, one HTML file is written:

| File                         | Description |
| ---------------------------- | ----------- |
| `.npm-compare/npm-compare.html` | New packages vs `HEAD`, with **Introduced by** (parent in the lockfile graph) |

---

## Configuration

Optional `"npm-compare"` section in `package.json`:

```json
{
  "npm-compare": {
    "outputDir": ".npm-compare"
  }
}
```

---

## Lock file support

| Format                       | Status      |
| ---------------------------- | ----------- |
| `package-lock.json` v1/v2/v3 | Supported   |
| `pnpm-lock.yaml`             | Supported   |
| `yarn.lock`                  | Not planned in this release |

---

## Security

This tool is published with **npm provenance** (`npm publish --provenance`), cryptographically linking every release to its GitHub Actions build. You can verify any published version at `https://www.npmjs.com/package/npm-compare`.

To report a vulnerability in `npm-compare` itself, see [SECURITY.md](./SECURITY.md).

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

[MIT](./LICENSE)
