// app/api/namespaces/route.ts
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

// app/api/namespaces/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const query = 'kube_namespace_created'; // Prometheus metric
    const res = await fetch(
      `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`
    );
    const data = await res.json();

    if (data.status !== 'success') {
      return NextResponse.json({ error: 'Failed to fetch from Prometheus' }, { status: 500 });
    }

    // Extract namespaces
    const namespaces: string[] = data.data.result.map((item: any) => item.metric);

    return NextResponse.json({ namespaces }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}