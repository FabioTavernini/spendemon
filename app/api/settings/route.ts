import { NextResponse } from 'next/server'

import {
  getSettingsFilePath,
  parseSettings,
  readSettingsFile,
  writeSettingsFile,
} from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const content = await readSettingsFile()
    const settings = parseSettings(content)

    return NextResponse.json(
      {
        path: getSettingsFilePath(),
        content,
        clusters: settings.clusters,
        costs: settings.costs,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { content?: string }

    if (typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'Request body must include a string "content" field.' },
        { status: 400 }
      )
    }

    await writeSettingsFile(body.content)
    const settings = parseSettings(body.content)

    return NextResponse.json(
      {
        ok: true,
        path: getSettingsFilePath(),
        clusters: settings.clusters,
        costs: settings.costs,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 400 }
    )
  }
}
