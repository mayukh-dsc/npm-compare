# GitHub issue (copy into a new issue or PR)

**Title:** npm: attribute hoisted transitive dependencies to their declaring package

## Summary

Hoisted packages in `package-lock.json` appear at `node_modules/<name>` with no nested parent path, so introducer attribution previously fell back to “Workspace root (hoisted or direct)” even when a transitive dependency was only required because of another package (e.g. `commander` and `yaml` pulled in by `what-new-pkg`).

## Proposed behavior

- Use each lockfile `packages` entry’s `dependencies` / `devDependencies` / `optionalDependencies` / `peerDependencies` together with semver resolution to attach **logical** parent ids to resolved nodes.
- When reporting **Introduced by**, prefer non–project-root logical parents so hoisted installs still show the declaring package (e.g. `what-new-pkg@0.1.0`).
- If only the root manifest `""` applies, keep the existing workspace-root wording.

## Implementation notes

- Synthetic node id `npm:lockfile:root` represents the root `package.json`; excluded from introduced/removed rows.
- Dependency: `semver` (and `@types/semver` for TypeScript).

## Acceptance criteria

- [ ] Hoisted npm transitive deps show the declaring package as introducer when unambiguous.
- [ ] Direct root dependencies still show workspace root when appropriate.
- [ ] Multiple logical parents produce `multi` introducer kind.
- [ ] pnpm behavior unchanged (already uses snapshot/importer edges).

---

_Implementation branch: `feature/npm-logical-introducers`._
