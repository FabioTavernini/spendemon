import { access, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parseSettings } from "@/lib/settings-config";

export * from "@/lib/settings-config";

const SETTINGS_FILE =
  process.env.SETTINGS_FILE_PATH || path.join(process.cwd(), "settings.yaml");
const SETTINGS_EXAMPLE_FILE =
  process.env.SETTINGS_EXAMPLE_FILE_PATH ||
  path.join(process.cwd(), "settings-example.yaml");
const DEPRECATED_TOP_LEVEL_SECTIONS = ["HA"];
const FALLBACK_DEFAULT_SETTINGS = `clusters:
  - name: cluster-1
    prometheusUrl: http://localhost:9090
  - name: cluster-2
    prometheusUrl: http://localhost:9090

costs:
  cpuCore: 0
  memoryGb: 0
  storageGb: 0

oidc:
  enabled: false
  issuer: ''
  clientId: ''
  clientSecret: ''
  adminGroup: admin
  viewerGroup: viewer
  debug: false
  extraScopes: ''

sharednamespaces:
`;

function getIndentation(line: string): number {
  return line.length - line.trimStart().length;
}

function findTopLevelSectionIndex(
  lines: string[],
  sectionName: string,
): number {
  return lines.findIndex((line) => line.trim() === `${sectionName}:`);
}

function findTopLevelSectionEndIndex(
  lines: string[],
  sectionIndex: number,
): number {
  let sectionEnd = lines.length;

  for (let index = sectionIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (getIndentation(line) === 0) {
      sectionEnd = index;
      break;
    }
  }

  return sectionEnd;
}

function removeTopLevelSection(content: string, sectionName: string): string {
  const normalizedContent = content.replace(/\r\n/g, "\n");
  const lines = normalizedContent.split("\n");
  const sectionIndex = findTopLevelSectionIndex(lines, sectionName);

  if (sectionIndex === -1) {
    return normalizedContent;
  }

  const updatedLines = [
    ...lines.slice(0, sectionIndex),
    ...lines.slice(findTopLevelSectionEndIndex(lines, sectionIndex)),
  ];
  const updatedContent = updatedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return updatedContent ? `${updatedContent}\n` : "";
}

function normalizeSettingsContent(content: string): string {
  return DEPRECATED_TOP_LEVEL_SECTIONS.reduce(
    (currentContent, sectionName) =>
      removeTopLevelSection(currentContent, sectionName),
    content,
  );
}

async function readDefaultSettings(): Promise<string> {
  try {
    return normalizeSettingsContent(
      await readFile(SETTINGS_EXAMPLE_FILE, "utf8"),
    );
  } catch {
    return FALLBACK_DEFAULT_SETTINGS;
  }
}

function readDefaultSettingsSync(): string {
  if (existsSync(SETTINGS_EXAMPLE_FILE)) {
    return normalizeSettingsContent(readFileSync(SETTINGS_EXAMPLE_FILE, "utf8"));
  }

  return FALLBACK_DEFAULT_SETTINGS;
}

export async function ensureSettingsFile(): Promise<void> {
  try {
    await access(SETTINGS_FILE);
  } catch {
    await writeFile(SETTINGS_FILE, await readDefaultSettings(), "utf8");
  }
}

export async function readSettingsFile(): Promise<string> {
  await ensureSettingsFile();
  const content = await readFile(SETTINGS_FILE, "utf8");
  const normalizedContent = normalizeSettingsContent(content);

  if (normalizedContent !== content) {
    await writeFile(SETTINGS_FILE, normalizedContent, "utf8");
  }

  return normalizedContent;
}

export function ensureSettingsFileSync(): void {
  if (!existsSync(SETTINGS_FILE)) {
    writeFileSync(SETTINGS_FILE, readDefaultSettingsSync(), "utf8");
  }
}

export function readSettingsFileSync(): string {
  ensureSettingsFileSync();
  const content = readFileSync(SETTINGS_FILE, "utf8");
  const normalizedContent = normalizeSettingsContent(content);

  if (normalizedContent !== content) {
    writeFileSync(SETTINGS_FILE, normalizedContent, "utf8");
  }

  return normalizedContent;
}

export async function writeSettingsFile(content: string): Promise<void> {
  const normalizedContent = normalizeSettingsContent(content);

  parseSettings(normalizedContent);
  await writeFile(SETTINGS_FILE, normalizedContent, "utf8");
}

export function getSettingsFilePath(): string {
  return SETTINGS_FILE;
}
