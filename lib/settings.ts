import { access, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parseSettings } from "@/lib/settings-config";

export * from "@/lib/settings-config";

const SETTINGS_FILE =
  process.env.SETTINGS_FILE_PATH || path.join(process.cwd(), "settings.yaml");
const DEFAULT_SETTINGS = `clusters:
  - name: cluster-1
    prometheusUrl: http://localhost:9090
  - name: cluster-2
    prometheusUrl: http://localhost:9090

costs:
  cpuCore: 0
  memoryGb: 0
  storageGb: 0

HA:
  enabled: false

sharednamespaces:

oidc:
  enabled: false
  issuer: ''
  clientId: ''
  clientSecret: ''
  adminGroup: admin
  viewerGroup: viewer
  debug: false
  extraScopes: ''
`;

export async function ensureSettingsFile(): Promise<void> {
  try {
    await access(SETTINGS_FILE);
  } catch {
    await writeFile(SETTINGS_FILE, DEFAULT_SETTINGS, "utf8");
  }
}

export async function readSettingsFile(): Promise<string> {
  await ensureSettingsFile();
  return readFile(SETTINGS_FILE, "utf8");
}

export function ensureSettingsFileSync(): void {
  if (!existsSync(SETTINGS_FILE)) {
    writeFileSync(SETTINGS_FILE, DEFAULT_SETTINGS, "utf8");
  }
}

export function readSettingsFileSync(): string {
  ensureSettingsFileSync();
  return readFileSync(SETTINGS_FILE, "utf8");
}

export async function writeSettingsFile(content: string): Promise<void> {
  parseSettings(content);
  await writeFile(SETTINGS_FILE, content, "utf8");
}

export function getSettingsFilePath(): string {
  return SETTINGS_FILE;
}
