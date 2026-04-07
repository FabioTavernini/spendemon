import { CostReporting } from '@/components/k8s/costreporting'
import { SiteHeader } from '@/components/site-header'

export const dynamic = 'force-dynamic'

export default async function CostReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ clusters?: string; namespaces?: string }>
}) {
  const params = await searchParams

  return (
    <>
      <div className="flex min-h-screen w-full min-w-0 flex-col bg-background px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
        <SiteHeader title="Cost Reporting" />

        <div className="flex min-w-0 flex-1 flex-col space-y-6 py-4 sm:py-6">
          <CostReporting clusters={params.clusters} namespaces={params.namespaces} />
        </div>
      </div>
    </>
  )
}
