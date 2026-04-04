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
npm run test:coverage  # Run tests with coverage report
npm run typecheck      # Type-check without emitting
npm run lint           # ESLint
```

## Project Structure

```
src/
├── types.ts               All TypeScript interfaces
├── scanner.ts             Parses package-lock.json
├── diff.ts                Diffs two package lists
├── snapshot.ts            Reads/writes snapshot JSON
├── config.ts              Loads config from package.json
├── logger.ts              Terminal output helpers
├── strategies/
│   ├── git.ts             Git-based comparison (Strategy B)
│   └── registry.ts        Registry audit (Strategy C)
├── reporter/
│   ├── shared.ts          Shared HTML utilities
│   ├── installed.ts       installed HTML report
│   ├── git-diff.ts        git diff HTML report
│   └── registry-audit.ts  registry audit HTML report
├── cli.ts                 Commander CLI entry point
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

## Adding lock file format support (yarn, pnpm)

This is one of the highest-impact contributions. The entry point is `src/scanner.ts`. The interface to implement is `ParsedLockfile`.

## Adding a new compare strategy

1. Create `src/strategies/your-strategy.ts`
2. Export it from `src/strategies/index.ts`
3. Create a reporter in `src/reporter/your-strategy.ts`
4. Wire it into `src/cli.ts`
5. Add the strategy name to `CompareStrategyName` in `src/types.ts`
6. Write tests

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
