// app/api/pods/route.ts
import { NextResponse } from 'next/server';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

export async function GET(request: Request) {
  try {
    // Get the "namespace" query parameter if provided
    const url = new URL(request.url);
    const namespace = url.searchParams.get('namespace'); // returns string | null

    // Build Prometheus query
    const query = namespace
      ? `kube_pod_info{namespace="${namespace}"}`
      : 'kube_pod_info';

    const res = await fetch(
      `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`
    );
    const data = await res.json();

    if (data.status !== 'success') {
      return NextResponse.json(
        { error: 'Failed to fetch from Prometheus' },
        { status: 500 }
      );
    }

    // Extract pods
    const pods: string[] = data.data.result.map((item: any) => item.metric);

    return NextResponse.json({ pods }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}