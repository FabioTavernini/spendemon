import { SectionCards } from "@/components/cards"
import { SiteHeader } from "@/components/site-header"
import { NamespacesTable } from "@/components/k8s/namespacestable"
import { Separator } from "@/components/ui/separator"
import { PodsTable } from "@/components/k8s/podstable";
export const dynamic = "force-dynamic";


export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ clusters?: string }>
}) {
  const params = await searchParams;

  console.log("PAGE params:", params); // 👈 debug

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <SiteHeader />

      <div className="flex flex-col flex-1 w-full px-4 py-6 space-y-8">
        <SectionCards />

        <Separator className="my-4" />

        <div className="overflow-x-auto rounded-lg border bg-card p-4">
          <NamespacesTable clusters={params.clusters} />
        </div>
        <div className="overflow-x-auto rounded-lg border bg-card p-4">
          <PodsTable clusters={params.clusters} />
        </div>
      </div>
    </div>
  );
}