---
sidebar_position: 2
---

# Infos

This page collects a few practical notes that are handy while working on the Spendemon docs.

## Project structure

- `docs/` contains the documentation pages
- `sidebars.ts` controls how docs appear in the sidebar
- `docusaurus.config.ts` contains the site-level configuration such as navigation, footer links, and theme settings

## Writing guidance

When adding or updating pages, aim for:

- a short opening paragraph that explains why the page matters
- one or two concrete examples when configuration or commands are involved
- links to the next logical page so readers do not get stuck

## Useful commands

```sh
npm run start
```

Starts the local Docusaurus development server.

```sh
npm run build
```

Builds the static site and helps catch broken pages or links.

```sh
npm run typecheck
```

Checks TypeScript files such as `docusaurus.config.ts`.
