# Releasing

Releases are automated by [`.github/workflows/release.yml`](.github/workflows/release.yml) when you push a **semver tag** `v*.*.*` (for example `v0.2.3`).

## Prerequisites

- **`NPM_TOKEN`** — Repository secret ([Settings → Secrets and variables → Actions](https://github.com/mayukh-dsc/what-new-pkg/settings/secrets/actions)). Use an npm **granular access token** with permission to publish **`what-new-pkg`** (or a classic token with publish rights for that package).
- **`package.json` `repository.url`** must match this GitHub repo so [npm provenance](https://docs.npmjs.com/generating-provenance-statements) can link the build to the source.

## Steps

1. Ensure **`main` is green** (CI passes).
2. Bump the version in **`package.json`** (and update **`CHANGELOG.md`** if you document the release there).
3. Commit and push to `main`.
4. Create and push a tag whose **number matches** `package.json` **exactly** (no `v` in the file, `v` only on the tag):

   ```bash
   git tag v0.2.3
   git push origin v0.2.3
   ```

   Or use `npm version patch` / `minor` / `major` (updates `package.json` and `package-lock.json`, creates a commit and tag locally; then `git push` and `git push --tags`).

The workflow checks that **`refs/tags/vX.Y.Z`** matches **`version`** in `package.json` before publishing. If they differ, the job fails with a clear error instead of a confusing npm publish failure.

## If publish fails

- Read the **`npm ERR!`** lines in the **Publish with provenance** log (not only “exit code 1”).
- Common causes: token missing or expired, token not allowed to publish this package, **version already on npm**, or provenance/repository mismatch.
