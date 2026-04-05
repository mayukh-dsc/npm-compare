# npm-compare

> A minimalistic, open-source security tool that audits your installed npm packages and detects supply-chain attacks — like the [axios incident](https://socket.dev/blog/inside-node-modules) — before they reach production.

[CI](https://github.com/mayukh-dsc/npm-compare/actions/workflows/ci.yml)
[npm version](https://www.npmjs.com/package/npm-compare)
[License: MIT](https://opensource.org/licenses/MIT)
[npm provenance](https://docs.npmjs.com/generating-provenance-statements)

---

## Why?

Supply-chain attacks on npm packages are growing. The classic signal: **a package is re-published at the same version number but with a different (malicious) payload**. Tools like `npm audit` only catch *known* CVEs. They miss zero-day tampering.

`npm-compare` catches what `npm audit` misses by:

1. **Snapshotting** every installed package's integrity hash after every `npm install`
2. **Diffing** against your last git commit's snapshot — so you instantly see what changed
3. **Cross-checking** live integrity hashes against the npm registry — so even a first-time install is audited

The key insight: if `axios@1.6.0`'s `sha512` hash in your lock file differs from what the registry says it should be, **something is very wrong**.

---

## Install

```bash
npm install --save-dev npm-compare
```

Then add the postinstall hook (or run `npm-compare setup`):

```json
{
  "scripts": {
    "postinstall": "npm-compare generate --compare=git,registry"
  }
}
```

Or use the setup command:

```bash
npx npm-compare setup
```

---

## Usage

### Generate a report

```bash
# Scan installed packages and generate the installed HTML report only
npm-compare generate

# Compare against your last git commit (Strategy B)
npm-compare generate --compare=git

# Audit integrity hashes against the npm registry (Strategy C)
npm-compare generate --compare=registry

# Both strategies
npm-compare generate --compare=git,registry

# Exit with code 1 if critical issues are found (useful for CI)
npm-compare generate --compare=git,registry --fail-on-critical
```

### Output files

By default, HTML reports are written under `**.npm-compare/**` in your project root (override with `outputDir` or `--output-dir`).


| File                                           | Description                                                    |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `.npm-compare/npm-compare-installed.html`      | Installed packages: **production** and **development** sections, each with a **collapsible dependency tree** (transitive chain) plus an optional flat sortable table |
| `.npm-compare/npm-compare-diff-git.html`       | Git diff vs last commit: changes split into production vs development dependency sections |
| `.npm-compare/npm-compare-audit-registry.html` | Registry audit: same prod/dev split; trees show audit status per node |
| `.npm-compare-snapshot.json`                   | Committed snapshot at project root (required for git strategy). Does not store dependency trees (only the flat package list). |


> **Important for the git strategy:** commit `.npm-compare-snapshot.json` to your repository. It is updated on every `npm install` and git-tracked, so you always have a diff target.

The `snapshotFile` path must be **repository-relative** and safe (no `..` segments or absolute paths). This is enforced when reading the snapshot from git.

---

## Configuration

Add an `"npm-compare"` section to your `package.json`:

```json
{
  "npm-compare": {
    "compare": ["git", "registry"],
    "outputDir": ".npm-compare",
    "registryUrl": "https://registry.npmjs.org",
    "concurrency": 10,
    "timeout": 10000,
    "snapshotFile": ".npm-compare-snapshot.json"
  }
}
```

`outputDir` defaults to `.npm-compare`; you can omit it unless you want a different folder.

CLI flags always override `package.json` config.

---

## What each strategy detects

### Strategy: git (`--compare=git`)

Compares the current `package-lock.json` scan against the snapshot saved in your last git commit.


| Signal                                          | Severity        |
| ----------------------------------------------- | --------------- |
| Integrity hash changed for same package version | 🚨 **Critical** |
| Package version changed                         | ⚠ Changed       |
| Package added or removed                        | ℹ Info          |
| Resolved URL changed                            | ⚠ Changed       |


### Strategy: registry (`--compare=registry`)

Cross-checks every package in your lock file against live data from the npm registry.


| Signal                                        | Severity        |
| --------------------------------------------- | --------------- |
| Lock file integrity ≠ registry integrity      | 🚨 **Critical** |
| Package not found on public registry          | ⚠ Warning       |
| Non-standard resolved URL                     | ⚠ Warning       |
| Package has install scripts (pre/postinstall) | ⚠ Warning       |
| Registry has no `dist.integrity` (cannot verify lock file hash) | ⚠ Warning |
| Newer version available                       | ℹ Info          |


---

## Security

This tool is published with **npm provenance** (`npm publish --provenance`), cryptographically linking every release to its GitHub Actions build. You can verify any published version at `https://www.npmjs.com/package/npm-compare`.

To report a vulnerability in `npm-compare` itself, see [SECURITY.md](./SECURITY.md).

---

## Lock file support


| Format                       | Status      |
| ---------------------------- | ----------- |
| `package-lock.json` v1/v2/v3 | ✔ Supported |
| `yarn.lock`                  | Planned     |
| `pnpm-lock.yaml`             | Planned     |


---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

[MIT](./LICENSE)