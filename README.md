# what-new-pkg

**See which packages entered your lockfile after an install**—and **who introduced them**—with a terminal summary and an HTML report.

Open-source CLI for **npm** and **pnpm**: it diffs the **current** lockfile against the same file at **git `HEAD`** and lists each **new** resolved package with its **immediate dependent** (or workspace root when hoisted).

[![npm version](https://img.shields.io/npm/v/what-new-pkg)](https://www.npmjs.com/package/what-new-pkg)
[![CI](https://img.shields.io/github/actions/workflow/status/mayukh-dsc/what-new-pkg/ci.yml?label=CI)](https://github.com/mayukh-dsc/what-new-pkg/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Releases are published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements) (build-linked attestations on npm).

---

## See what you get

**Terminal** — highlights when new packages show up:

![Terminal: new packages highlighted](docs/demo-images/terminal-output.png)

**HTML report** (default: `.what-new-pkg/what-new-pkg.html`) — introduced vs `HEAD` with **Introduced by**; removals with **Previously under**:

![HTML report: introduced and removed packages](docs/demo-images/html-report.png)

- New transitive additions can trigger a **warning**-styled line with a **bold** count; **removals alone** do not trigger that line.

---

## Why?

- **Transitive supply chain:** Compromised or unwanted code often arrives through **dependencies of dependencies**—and can reach **production** builds and runtime. You need to know **what** landed in the lockfile and **which parent** pulled it in.
- **This tool** surfaces that by diffing your lockfile to `git show HEAD:<lockfile>`.

---

## Install

```bash
npm install --save-dev what-new-pkg
```

Optional: add a **postinstall** hook (or run `npx what-new-pkg setup`):

```json
{
  "scripts": {
    "postinstall": "what-new-pkg generate"
  }
}
```

---

## Usage

**Typical** (auto-detects `pnpm-lock.yaml` if present, else `package-lock.json`):

```bash
what-new-pkg generate
```

**More options**

```bash
# Lockfile path (relative to project root)
what-new-pkg generate --lock-file package-lock.json

# Output directory (default: .what-new-pkg)
what-new-pkg generate --output-dir .what-new-pkg

# Sample HTML (dummy diff; no git or real lockfile required)
what-new-pkg demo
```

From the repo root, `npm run demo` builds and writes `.what-new-pkg/what-new-pkg.html` for a quick browser preview.

### How comparison works

- The baseline is the **committed** lockfile at **`HEAD`** for the **same path**. Commit your lockfile so diffs mean something. If it is missing from `HEAD` or the project is not a git repo, the report explains that and shows no “introduced” rows (no crash).
- **Monorepos:** run once per **package root** that owns a lockfile (e.g. workspace root with one `pnpm-lock.yaml` or `package-lock.json`).

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

This package is published with **npm provenance** (`npm publish --provenance`), linking each release to its GitHub Actions build. Verify versions on [npm](https://www.npmjs.com/package/what-new-pkg).

To report a vulnerability in `what-new-pkg` itself, see [SECURITY.md](./SECURITY.md).

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

[MIT](./LICENSE)
