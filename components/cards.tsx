import {
  IconBracketsContain,
  IconBoxMultiple,
  IconFolders,
  IconTopologyStar3,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getClusters } from "@/lib/clusters";

type PodsResponse = {
  totalPods: number;
  totalClusters: number;
  clusters: Record<
    string,
    {
      totalPods: number;
      namespaces: Record<string, string[]>;
    }
  >;
};

type Cluster = {
  name: string;
  prometheusUrl: string;
};

type ClusterResponse = {
  totalClusters: number;
  clusters: Cluster[];
};

type NamespacesResponse = {
  totalClusters?: number;
  totalNamespaces?: number;
  namespaces?: Array<{
    cluster: string;
    namespace: string;
  }>;
  clusters?: Record<
    string,
    {
      totalNamespaces?: number;
      namespaces: string[] | Record<string, unknown>;
    }
  >;
};

export async function SectionCards({
  clusters: clusterFilter,
  namespaces: namespaceFilter,
}: {
  clusters?: string
  namespaces?: string
}) {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const fallbackClusters = await getClusters();
  const params = new URLSearchParams();

  if (clusterFilter) {
    params.set("clusters", clusterFilter);
  }

  if (namespaceFilter) {
    params.set("namespaces", namespaceFilter);
  }

  const queryString = params.toString();
  const podsUrl = queryString ? `${baseUrl}/api/pods?${queryString}` : `${baseUrl}/api/pods`;
  const namespacesUrl = queryString
    ? `${baseUrl}/api/namespaces?${queryString}`
    : `${baseUrl}/api/namespaces`;

  const [podsRes, clustersRes, namespacesRes] = await Promise.all([
    fetch(podsUrl, { cache: "no-store" }),
    fetch(`${baseUrl}/api/clusters`, { cache: "no-store" }),
    fetch(namespacesUrl, { cache: "no-store" }),
  ]);

  const [pods, clustersResponse, namespacesResponse]: [
    PodsResponse,
    ClusterResponse,
    NamespacesResponse
  ] = await Promise.all([
    podsRes.json(),
    clustersRes.json(),
    namespacesRes.json(),
  ]);

  const totalPods = pods?.totalPods ?? 0;
  const totalClusters =
    pods?.totalClusters ??
    namespacesResponse?.totalClusters ??
    clustersResponse?.totalClusters ??
    fallbackClusters.length;

  let totalNamespaces = 0;

  if (typeof namespacesResponse?.totalNamespaces === "number") {
    totalNamespaces = namespacesResponse.totalNamespaces;
  } else if (Array.isArray(namespacesResponse?.namespaces)) {
    totalNamespaces = namespacesResponse.namespaces.length;
  } else if (namespacesResponse?.clusters) {
    totalNamespaces = Object.values(namespacesResponse.clusters).reduce((acc, cluster) => {
      if (Array.isArray(cluster.namespaces)) {
        return acc + cluster.namespaces.length;
      }

      if (cluster.namespaces && typeof cluster.namespaces === "object") {
        return acc + Object.keys(cluster.namespaces).length;
      }

      return acc;
    }, 0);
  }

  const avgPodsPerCluster =
    totalClusters > 0 ? (totalPods / totalClusters).toFixed(1) : "0";

  const largestNamespace = Object.entries(pods?.clusters ?? {}).reduce(
    (largest, [clusterName, clusterData]) => {
      for (const [namespaceName, podList] of Object.entries(clusterData.namespaces)) {
        if (podList.length > largest.count) {
          largest = {
            name: `${clusterName} / ${namespaceName}`,
            count: podList.length,
          };
        }
      }
      return largest;
    },
    { name: "N/A", count: 0 }
  );

  return (
    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Total Pods</CardDescription>
          <CardTitle className="flex items-center gap-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            <IconBoxMultiple className="size-5 text-muted-foreground" />
            {totalPods}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">{totalClusters} cluster{totalClusters !== 1 ? "s" : ""}</Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Current pods across all connected clusters</div>
          <div className="text-muted-foreground">
            Live count from Prometheus
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Total Clusters</CardDescription>
          <CardTitle className="flex items-center gap-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            <IconTopologyStar3 className="size-5 text-muted-foreground" />
            {totalClusters}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">Connected</Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Available cluster targets</div>
          <div className="text-muted-foreground">
            Loaded from /api/clusters
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Total Namespaces</CardDescription>
          <CardTitle className="flex items-center gap-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            <IconFolders className="size-5 text-muted-foreground" />
            {totalNamespaces}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">Unique</Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Namespaces detected across clusters</div>
          <div className="text-muted-foreground">
            Useful for quick scope visibility
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Avg Pods / Cluster</CardDescription>
          <CardTitle className="flex items-center gap-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            <IconBracketsContain className="size-5 text-muted-foreground" />
            {avgPodsPerCluster}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">{largestNamespace.count} max</Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">Largest namespace: {largestNamespace.name}</div>
          <div className="text-muted-foreground">
            {largestNamespace.count} pod{largestNamespace.count !== 1 ? "s" : ""}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
