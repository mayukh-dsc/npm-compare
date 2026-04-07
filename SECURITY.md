# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.x (latest) | ✔ Yes |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities via GitHub issues.** Public issues are visible to everyone, including potential attackers.

Instead, report vulnerabilities privately via one of these channels:

- **GitHub private vulnerability reporting:** Use the "Report a vulnerability" button on the [Security tab](../../security/advisories/new)
- **Email:** security@YOUR_DOMAIN (replace with your contact)

Please include:

1. A description of the vulnerability and its potential impact
2. Steps to reproduce (a minimal proof-of-concept if possible)
3. Affected versions
4. Any suggested mitigations

You can expect an initial response within **72 hours** and a patch within **7 days** for critical issues.

## Disclosure Policy

We follow [Coordinated Vulnerability Disclosure (CVD)](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html). We will:

1. Acknowledge your report promptly
2. Keep you informed as we investigate and patch
3. Credit you in the release notes (unless you prefer anonymity)
4. Publish a security advisory after the patch is released

## Our Own Security Practices

Given that this is a security tool, we hold ourselves to a high standard:

- All releases are published with **npm provenance** — cryptographically linking the published package to the specific GitHub Actions run that built it
- Dependencies are kept to an absolute minimum (currently only `yaml` for `pnpm-lock.yaml` parsing)
- All code is TypeScript with strict mode enabled
- CodeQL security scanning runs on every PR via GitHub Actions
- We run `npm audit` on ourselves in CI
