import {
  getSettingsFilePath,
  parseCostsFromSettings,
  parseHaFromSettings,
  parseSharedNamespacesFromSettings,
  readSettingsFile,
} from "@/lib/settings";
import { requirePageRole } from "@/lib/authorization";

import { SettingsEditor } from "./settings-editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePageRole("admin");

  const initialContent = await readSettingsFile();
  const initialPath = getSettingsFilePath();
  const initialCosts = parseCostsFromSettings(initialContent);
  const initialHa = parseHaFromSettings(initialContent);
  const initialSharedNamespaces =
    parseSharedNamespacesFromSettings(initialContent);

  return (
    <SettingsEditor
      initialContent={initialContent}
      initialCosts={initialCosts}
      initialHa={initialHa}
      initialSharedNamespaces={initialSharedNamespaces}
      initialPath={initialPath}
    />
  );
}
