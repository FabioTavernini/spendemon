import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { getClusters } from '@/lib/clusters'
import { Button } from '@/components/ui/button'

export async function LicenseBanner() {
  const clusters = await getClusters()
  if (clusters.length <= 1) return null

  return (
    <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          You are monitoring <strong>{clusters.length} clusters</strong>. Commercial use with multiple clusters requires a license —{' '}
          <strong>$29/mo</strong> for up to 5 clusters or <strong>$59/mo</strong> for unlimited.
        </p>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
        >
          <Link href={"https://spendemon.com/contact"} rel="noreferrer" target="_blank">
            Get a license
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
