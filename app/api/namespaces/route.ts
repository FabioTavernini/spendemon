import { NextResponse } from 'next/server';

type Cluster = {
  name: string;
  prometheusUrl: string;
};

async function getClusters(): Promise<Cluster[]> {
  // In real life: fetch from your clusters endpoint
  return [
    { name: "cluster-1", prometheusUrl: "http://localhost:9090" },
    { name: "cluster-2", prometheusUrl: "http://localhost:9090" },
  ];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clustersParam = searchParams.get('clusters');

    const allClusters = await getClusters();

    // ✅ Resolve which clusters to query
    let selectedClusters: Cluster[];

    if (!clustersParam) {
      // 👉 default: ALL clusters
      selectedClusters = allClusters;
    } else {
      const requested = clustersParam.split(',');
      selectedClusters = allClusters.filter(c =>
        requested.includes(c.name)
      );
    }

    const query = 'kube_namespace_created';

    // ✅ Query all clusters in parallel
    const responses = await Promise.all(
      selectedClusters.map(async (cluster) => {
        try {
          const res = await fetch(
            `${cluster.prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`
          );

          const data = await res.json();

          if (data.status !== 'success') return [];

          return data.data.result.map((item: any) => ({
            cluster: cluster.name,
            namespace: item.metric.namespace, // ✅ FIXED
          }));
        } catch {
          return [];
        }
      })
    );

    // ✅ Flatten + dedupe
    const namespaceSet = new Set<string>();
    const result: { cluster: string; namespace: string }[] = [];

    for (const clusterResults of responses) {
      for (const item of clusterResults) {
        const key = `${item.cluster}:${item.namespace}`;
        if (!namespaceSet.has(key)) {
          namespaceSet.add(key);
          result.push(item);
        }
      }
    }

    return NextResponse.json({ namespaces: result }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}