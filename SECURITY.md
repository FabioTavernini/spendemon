# Security Policy

## Reporting Security Issues

If you believe you have found a security vulnerability in Spendemon, please do not report it through a public GitHub issue.

Instead:

- Use GitHub's private vulnerability reporting
- If private reporting is not available, contact the project maintainer privately through GitHub

Please include as much detail as possible:

- A description of the issue
- Steps to reproduce it
- The affected version, commit, or deployment setup
- The potential impact
- Any suggested mitigation or fix, if you have one

Reports will be reviewed in good faith and handled as quickly as reasonably possible.

## What to Report Here

Examples of security-relevant issues include:

- Authentication or authorization bypass
- Sensitive data exposure
- Server-side request or configuration abuse
- Dependency vulnerabilities that materially affect this project
- Vulnerabilities in the Docker, Kubernetes, or Helm deployment assets

If you are unsure whether something is a security issue, it is fine to report it privately first.

## Public Bugs and Non-Security Issues

For normal bugs, usability problems, documentation issues, and feature requests, please use the normal GitHub issue tracker instead. See `CONTRIBUTING.md` for general contribution guidance.

## Supported Versions

Security fixes are generally applied to the latest state of the `main` branch.

If older versions or deployments can be patched safely, fixes may be backported at maintainer discretion, but this is not guaranteed.

## Disclosure

Please allow time for the issue to be investigated and, when possible, fixed before making it public.

Coordinated disclosure helps protect users while a patch or mitigation is being prepared.
