---
sidebar_position: 1
---

# Quickstart

This section is for contributors and maintainers who want to work on Spendemon locally.

## Docs development

From the docs project root, install dependencies and start the Docusaurus site:

```sh
npm install
npm run start
```

This starts a local development server with live reload so you can iterate on documentation quickly.

## Typical contribution flow

1. Make your content or code changes.
2. Run the local dev server and review the result in the browser.
3. Repeat until the page structure, wording, and links look right.
4. Build the site before opening a pull request when possible.

## Build for verification

Use the production build to catch broken pages, invalid links, or other static-site issues:

```sh
npm run build
```

## Where to look next

- Use [Settings](../Configure/Settings) when you need the runtime configuration format.
- Use [Infos](./useful) for a few practical notes while working in this docs site.
