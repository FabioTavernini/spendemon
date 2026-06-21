import { CostReporting } from "@/components/k8s/cost-reporting/costreporting";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export default async function CostReportingPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    clusters?: string;
    namespaces?: string;
    range?: string;
  }>;
}>) {
  const params = await searchParams;

  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-col bg-background px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
      <SiteHeader title="Cost Reporting" />

      <div className="flex min-w-0 flex-1 flex-col space-y-6 py-4 sm:py-6">
        <CostReporting
          clusters={params.clusters}
          namespaces={params.namespaces}
          range={params.range}
        />
      </div>
    </div>
  );
}
