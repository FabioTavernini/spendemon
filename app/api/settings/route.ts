import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/authorization";
import {
  getSettingsFilePath,
  parseSettings,
  readSettingsFile,
  writeSettingsFile,
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
        content,
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

export async function PUT(req: Request) {
  const session = await requireApiRole("admin");

  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const body = (await req.json()) as { content?: string };

    if (typeof body.content !== "string") {
      return NextResponse.json(
        { error: 'Request body must include a string "content" field.' },
        { status: 400 },
      );
    }

    const content = body.content;

    await writeSettingsFile(content);
    const settings = parseSettings(content);
    const { clientSecret: _redacted, ...oidcPublic } = settings.oidc;

    return NextResponse.json(
      {
        ok: true,
        path: getSettingsFilePath(),
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
      { status: 400 },
    );
  }
}
