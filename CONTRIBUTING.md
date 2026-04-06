# Contributing to npm-compare

Thank you for your interest in contributing! This document explains how to get started.

## Development Setup

```bash
git clone https://github.com/mayukh-dsc/npm-compare.git
cd npm-compare
npm install
```

### Available scripts

```bash
npm run build          # Compile TypeScript → dist/
npm run dev            # Watch mode
npm run test           # Run tests once
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
npm run typecheck      # Type-check without emitting
npm run lint           # ESLint
```

## Project Structure

```
src/
├── graph/
│   ├── types.ts           Canonical LockfileGraph / LockfileNode
│   └── diff.ts            Id-based graph diff, introduced rows
├── adapters/
│   ├── npm-lockfile.ts    package-lock.json → LockfileGraph
│   └── pnpm-lockfile.ts   pnpm-lock.yaml → LockfileGraph
├── parse-lockfile.ts      Factory + default lockfile resolution
├── dependency-tree.ts     npm tree helpers (getParentLockfilePath, buildDependencyTrees)
├── types.ts               Shared config / legacy types
├── config.ts              Loads config from package.json
├── logger.ts              Terminal output helpers
├── strategies/
│   └── git.ts             git show HEAD:<lockfile>
├── reporter/
│   ├── shared.ts          HTML utilities
│   └── intro-report.ts    Single HTML report
├── cli.ts                 Commander CLI entry
└── index.ts               Public API exports
```

## Guidelines

### Code style

- TypeScript strict mode — no `any`, no implicit returns
- All functions must have unit tests
- Keep dependencies minimal — the fewer packages we add, the safer we are
- No external CDN links in generated HTML — reports must be fully self-contained

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `test:` — tests only
- `docs:` — documentation only
- `chore:` — tooling, deps, config

### Pull requests

1. Fork the repository and create a branch from `main`
2. Make your changes with tests
3. Ensure `npm run typecheck && npm run lint && npm run test` all pass
4. Open a pull request using the provided template

### Security

If you find a security vulnerability, please read [SECURITY.md](./SECURITY.md) before opening an issue.

## Adding lock file format support

Implement a new adapter under `src/adapters/` that maps the format to `LockfileGraph` (see `npm-lockfile.ts` and `pnpm-lockfile.ts`). Wire it in `parse-lockfile.ts`.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
