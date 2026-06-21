#!/usr/bin/env node
// Propagate the version in package.json to every other place that hardcodes it.
// Source of truth: package.json "version" (set via `npm version <x.y.z>`).
// Run standalone with `npm run version:sync`, or automatically via npm's
// `version` lifecycle hook when running `npm version <x.y.z>`.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const version = JSON.parse(read('package.json')).version;

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Refusing to sync: unexpected version "${version}" in package.json`);
  process.exit(1);
}

// [file, [ [regex, replacement], ... ]]
const edits = [
  [
    'charts/spendemon/Chart.yaml',
    [
      [/^version:.*$/m, `version: ${version}`],
      [/^appVersion:.*$/m, `appVersion: "${version}"`],
    ],
  ],
  [
    'charts/spendemon/README.md',
    [
      [/Version-[\d.]+-informational/g, `Version-${version}-informational`],
      [/AppVersion-[\d.]+-informational/g, `AppVersion-${version}-informational`],
      [/!\[Version: [\d.]+\]/, `![Version: ${version}]`],
      [/!\[AppVersion: [\d.]+\]/, `![AppVersion: ${version}]`],
    ],
  ],
  [
    'README.md',
    [[/--version [\d.]+/g, `--version ${version}`]],
  ],
  [
    'deploy/spendemon.yaml',
    [[/(spendemon):[\d.]+/g, `$1:${version}`]],
  ],
];

let changed = false;
for (const [file, replacements] of edits) {
  const before = read(file);
  let after = before;
  for (const [re, to] of replacements) after = after.replace(re, to);
  if (after !== before) {
    writeFileSync(resolve(root, file), after);
    console.log(`updated ${file} -> ${version}`);
    changed = true;
  }
}

if (!changed) console.log(`all files already at ${version}`);
