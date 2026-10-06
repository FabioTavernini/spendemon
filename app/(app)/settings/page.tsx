import {
  getSettingsFilePath,
  parseCostsFromSettings,
  parseSharedNamespacesFromSettings,
  readSettingsFile,
  redactSettingsSecrets,
} from "@/lib/settings";
import { requirePageRole } from "@/lib/authorization";

import { SettingsViewer } from "./settings-viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePageRole("admin");

  const initialContent = await readSettingsFile();
  const initialPath = getSettingsFilePath();
  const initialCosts = parseCostsFromSettings(initialContent);
  const initialSharedNamespaces =
    parseSharedNamespacesFromSettings(initialContent);

  return (
    <SettingsViewer
      initialContent={redactSettingsSecrets(initialContent)}
      initialCosts={initialCosts}
      initialSharedNamespaces={initialSharedNamespaces}
      initialPath={initialPath}
    />
  );
}
