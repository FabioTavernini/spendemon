// lib/clusters.ts
export type Cluster = {
  name: string;
  prometheusUrl: string;
};

export function getClusters(): Cluster[] {
  return [
    { name: 'cluster-1', prometheusUrl: 'http://localhost:9090' },
    { name: 'cluster-2', prometheusUrl: 'http://localhost:9090' },
    // { name: 'cluster-3', prometheusUrl: 'http://localhost:9092' },
  ];
}