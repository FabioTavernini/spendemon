// app/api/namespaces/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const clusters = [
            "cluster-1",
            "cluster-2",
            "cluster-3"
        ];
        return NextResponse.json(clusters, { status: 200 }); // return array directly
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}