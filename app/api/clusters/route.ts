// app/api/namespaces/route.ts

import { NextResponse } from 'next/server';

type Cluster = {
    name: string;
    prometheusUrl: string;
};

export async function GET() {
    try {
        const clusters: Cluster[] = [
            { name: "cluster-1", prometheusUrl: "http://localhost:9090" },
            { name: "cluster-2", prometheusUrl: "http://localhost:9091" },
            { name: "cluster-3", prometheusUrl: "http://localhost:9092" },
        ];
        return NextResponse.json(clusters, { status: 200 }); // return array directly
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}