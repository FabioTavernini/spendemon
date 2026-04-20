# Contribution Guidelines

Thank you for considering contributing to Spendemon. Contributions to the app, deployment assets, and documentation are all welcome.

## Table of Contents

- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Submitting Changes](#submitting-changes)
- [Coding Conventions](#coding-conventions)
- [Documentation](#documentation)
- [License](#license)

## Reporting Issues

If you find a bug or run into an unexpected behavior, please open a GitHub issue.

Before creating a new issue:

- Check whether a similar issue already exists.
- Include a clear description of the problem.
- Add steps to reproduce, expected behavior, and actual behavior.
- Include screenshots, logs, or error messages when they help explain the problem.

## Feature Requests

Feature requests are welcome through GitHub issues as well.

When suggesting a feature, please include:

- The problem you are trying to solve
- The change you would like to see
- Any relevant context, examples, or screenshots

This helps keep discussions focused and makes it easier to evaluate improvements.

## Submitting Changes

To contribute code or documentation changes:

1. Fork the repository and create a branch for your work.
2. Install dependencies with `npm install`.
3. Start the local development server with `npm run dev`.
4. Make your changes in small, focused commits.
5. Run the project checks before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run build
```

6. If you changed formatting-sensitive TypeScript files, also run:

```bash
npm run format
```

7. Push your branch and open a pull request against `main`.
8. Describe what changed, why it changed, and note any UI, API, configuration, or deployment impact.

If your change affects the UI, screenshots are helpful.

## Coding Conventions

Please follow the existing patterns used in the repository.

- Prefer clear, readable TypeScript over clever abstractions.
- Keep components and helpers focused on a single responsibility.
- Follow the current project structure in `app/`, `components/`, and `lib/`.
- Use descriptive commit messages.
- Avoid committing secrets or environment-specific values.

Spendemon reads local configuration from `settings.yaml`. For examples and safe defaults, prefer `settings-example.yaml`.

## Documentation

Documentation improvements are always appreciated.

If your change affects setup, configuration, behavior, or deployment, please update the relevant documentation in the same pull request. This may include files such as `README.md`, `settings-example.yaml`, or deployment docs under `docs/` and `deploy/`.

## License

By submitting a contribution, you agree that your work may be distributed under the licenses used by this repository. See `LICENSE` and `COMMERCIAL.md` for details.
