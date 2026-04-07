# what-new-pkg

> A minimalistic, open-source tool that **compares your lockfile to the last committed version in git** and reports **newly introduced dependencies**, with **who depends on whom** in the resolved graph (npm or pnpm).

[CI](https://github.com/mayukh-dsc/what-new-pkg/actions/workflows/ci.yml)
[npm version](https://www.npmjs.com/package/what-new-pkg)
[License: MIT](https://opensource.org/licenses/MIT)
[npm provenance](https://docs.npmjs.com/generating-provenance-statements)

---

## Why?

- **Transitive supply-chain risk:** A widely reported npm incident showed that compromised code can reach you through **dependencies of dependencies**—not only packages you list in `package.json`.
- **Production impact:** A transitive supply-chain breach can ship malicious code into **production** builds and runtime—so you need to know **what** newly appeared in the lockfile and **which parent** pulled it in.
- **`what-new-pkg`** diffs the **current** lockfile against `git show HEAD:<lockfile>` and lists each **new** resolved package with its **immediate dependent** (or workspace root when hoisted).

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
```

From the repository root you can also run `npm run demo` (builds then writes `.what-new-pkg/what-new-pkg.html` under the current directory). Open the HTML file in a browser to preview it.

### Baseline

Comparison uses the **same lockfile path** committed at **git `HEAD`**. Commit your lockfile so the tool has a baseline. If the file is missing from `HEAD` or the project is not a git repository, the report explains that and shows no introduced rows (no crash).

### Monorepos

Run once per **package root** that owns a lockfile (e.g. workspace root with a single `pnpm-lock.yaml` or `package-lock.json`).

---

## Output:

In the terminal, the tool highlights when any new package is introduced:

![Terminal: new packages highlighted](docs/demo-images/terminal-output.png)

By default, one HTML file is written (`.what-new-pkg/what-new-pkg.html`):

| File                              | Description                                                                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.what-new-pkg/what-new-pkg.html` | **Introduced** packages vs `HEAD` (orange highlights) with **Introduced by**, and **Removed** packages (green) with **Previously under** (parent in the baseline lockfile graph) |

Example HTML report:

![HTML report: introduced and removed packages](docs/demo-images/html-report.png)

When `generate` compares against git `HEAD` and finds **new** packages (including transitive additions), the CLI prints a **warning**-styled line with a **bold** count so removals alone stay quiet. Package removals do not trigger that line.

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


| Format                       | Status                      |
| ---------------------------- | --------------------------- |
| `package-lock.json` v1/v2/v3 | Supported                   |
| `pnpm-lock.yaml`             | Supported                   |
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