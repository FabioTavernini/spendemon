// app/api/namespaces/route.ts
import { NextResponse } from 'next/server';
import { getClusters } from '@/lib/clusters';

type Cluster = {
  name: string;
  prometheusUrl: string;
};

type PodItem = {
  cluster: string;
  namespace: string;
  pod: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clustersParam = searchParams.get('clusters');

    const allClusters = await getClusters();

    let selectedClusters: Cluster[];
    if (!clustersParam) {
      selectedClusters = allClusters;
    } else {
      const requested = clustersParam.split(',').map(c => c.trim());
      selectedClusters = allClusters.filter(c => requested.includes(c.name));
    }

    const query = 'kube_pod_info';

    const responses = await Promise.all(
      selectedClusters.map(async (cluster): Promise<PodItem[]> => {
        try {
          const res = await fetch(
            `${cluster.prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`
          );
          const data = await res.json();

          if (data.status !== 'success') return [];

          return data.data.result.map((item: any) => ({
            cluster: cluster.name,
            namespace: item.metric.namespace,
            pod: item.metric.pod,
          }));
        } catch (err) {
          console.error(`Error querying cluster ${cluster.name}:`, err);
          return [];
        }
      })
    );

    const flatResults = responses.flat();

    // Dedupe by cluster + namespace + pod
    const seen = new Set<string>();
    const uniquePods: PodItem[] = [];

    for (const item of flatResults) {
      const key = `${item.cluster}:${item.namespace}:${item.pod}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePods.push(item);
      }
    }

    // Group by cluster -> namespace -> pods[]
    const grouped: Record<
      string,
      {
        totalPods: number;
        namespaces: Record<string, string[]>;
      }
    > = {};

    for (const item of uniquePods) {
      if (!grouped[item.cluster]) {
        grouped[item.cluster] = {
          totalPods: 0,
          namespaces: {},
        };
      }

      if (!grouped[item.cluster].namespaces[item.namespace]) {
        grouped[item.cluster].namespaces[item.namespace] = [];
      }

      grouped[item.cluster].namespaces[item.namespace].push(item.pod);
      grouped[item.cluster].totalPods += 1;
    }

    return NextResponse.json(
      {
        totalPods: uniquePods.length,
        totalClusters: Object.keys(grouped).length,
        clusters: grouped,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}