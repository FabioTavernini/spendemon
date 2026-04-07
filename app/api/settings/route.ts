import { NextResponse } from 'next/server'

import {
  getSettingsFilePath,
  parseClustersFromSettings,
  readSettingsFile,
  writeSettingsFile,
} from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const content = await readSettingsFile()
    const clusters = parseClustersFromSettings(content)

    return NextResponse.json(
      {
        path: getSettingsFilePath(),
        content,
        clusters,
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

    return NextResponse.json(
      {
        ok: true,
        path: getSettingsFilePath(),
        clusters: parseClustersFromSettings(body.content),
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
