import { SectionCards } from "@/components/cards"
import { SiteHeader } from "@/components/site-header"
import { NamespacesTable } from "@/components/k8s/namespacestable"
import { Separator } from "@/components/ui/separator"
import { PodsTable } from "@/components/k8s/podstable";
export const dynamic = "force-dynamic";


export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ clusters?: string; namespaces?: string }>
}) {
  const params = await searchParams;

  return (
    <>
      <div className="flex min-h-screen w-full min-w-0 flex-col bg-background px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">

        <SiteHeader />

        <div className="flex min-w-0 flex-1 flex-col space-y-6 py-4 sm:py-6">
          <SectionCards clusters={params.clusters} namespaces={params.namespaces} />

          <Separator className="my-4" />

          <div className="min-w-0 rounded-lg border bg-card p-3 sm:p-4">
            <NamespacesTable
              clusters={params.clusters}
              namespaces={params.namespaces}
            />
          </div>
          <div className="min-w-0 rounded-lg border bg-card p-3 sm:p-4">
            <PodsTable clusters={params.clusters} namespaces={params.namespaces} />
          </div>
        </div>
      </div>
    </>
  );
}
