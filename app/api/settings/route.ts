import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/authorization";
import {
  getSettingsFilePath,
  parseSettings,
  redactSettingsSecrets,
  readSettingsFile,
} from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireApiRole("admin");

  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const content = await readSettingsFile();
    const settings = parseSettings(content);
    const { clientSecret: _redacted, ...oidcPublic } = settings.oidc;

    return NextResponse.json(
      {
        path: getSettingsFilePath(),
        content: redactSettingsSecrets(content),
        clusters: settings.clusters,
        costs: settings.costs,
        sharedNamespaces: settings.sharedNamespaces,
        oidc: oidcPublic,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
