# what-new-pkg

> A minimalistic, open-source tool that **compares your lockfile to the last committed version in git** and reports **newly introduced dependencies**, with **who depends on whom** in the resolved graph (npm or pnpm).

[CI](https://github.com/mayukh-dsc/what-new-pkg/actions/workflows/ci.yml)
[npm version](https://www.npmjs.com/package/what-new-pkg)
[License: MIT](https://opensource.org/licenses/MIT)
[npm provenance](https://docs.npmjs.com/generating-provenance-statements)

---

## Why?

After an install or upgrade, you often need to answer: **which package pulled in this new transitive dependency?** `what-new-pkg` diffs the **current** lockfile against **`git show HEAD:<lockfile>`** and lists each **new** resolved package with its **immediate dependent** (or workspace root when hoisted).

---

## Install

```bash
npm install --save-dev what-new-pkg
```

Then add the postinstall hook (or run `what-new-pkg setup`):

```json
{
  "scripts": {
    "postinstall": "what-new-pkg generate"
  }
}
```

Or:

```bash
npx what-new-pkg setup
```

---

## Usage

```bash
# Auto-detect lockfile: pnpm-lock.yaml if present, else package-lock.json
what-new-pkg generate

# Explicit lockfile path (relative to project root)
what-new-pkg generate --lock-file package-lock.json

# Output directory (default: .what-new-pkg)
what-new-pkg generate --output-dir .what-new-pkg

# Sample report (dummy lockfile diff; no git or real lockfile required)
what-new-pkg demo
what-new-pkg demo --open
```

From the repository root you can also run `npm run demo` (builds then writes `.what-new-pkg/what-new-pkg.html` under the current directory).

### Baseline

Comparison uses the **same lockfile path** committed at **git `HEAD`**. Commit your lockfile so the tool has a baseline. If the file is missing from `HEAD` or the project is not a git repository, the report explains that and shows no introduced rows (no crash).

### Monorepos

Run once per **package root** that owns a lockfile (e.g. workspace root with a single `pnpm-lock.yaml` or `package-lock.json`).

---

## Output

By default, one HTML file is written:

| File                         | Description |
| ---------------------------- | ----------- |
| `.what-new-pkg/what-new-pkg.html` | **Introduced** packages vs `HEAD` (orange highlights) with **Introduced by**, and **Removed** packages (green) with **Previously under** (parent in the baseline lockfile graph) |

---

## Configuration

Optional `"what-new-pkg"` section in `package.json`:

```json
{
  "what-new-pkg": {
    "outputDir": ".what-new-pkg"
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

This tool is published with **npm provenance** (`npm publish --provenance`), cryptographically linking every release to its GitHub Actions build. You can verify any published version at `https://www.npmjs.com/package/what-new-pkg`.

To report a vulnerability in `what-new-pkg` itself, see [SECURITY.md](./SECURITY.md).

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

[MIT](./LICENSE)
