import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { getClusters } from '@/lib/clusters'
import { Button } from '@/components/ui/button'

const STRIPE_PRO = 'https://buy.stripe.com/9B69AUbLSbd02EpfQD7N600'
const STRIPE_UNLIMITED = 'https://buy.stripe.com/7sY3cw7vCftg0whcEr7N601'

export async function LicenseBanner() {
  const clusters = await getClusters()
  if (clusters.length <= 1) return null

  const stripeUrl = clusters.length <= 5 ? STRIPE_PRO : STRIPE_UNLIMITED
  const planLabel = clusters.length <= 5 ? 'Pro license' : 'Unlimited license'

  return (
    <div className="bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 rounded-lg m-4 border-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          You are monitoring <strong>{clusters.length} clusters</strong>. Free use is intended for personal, non-commercial, and
          small-scale internal use. Commercial production use requires a <strong>{planLabel}</strong>.
        </p>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
        >
          <Link href={stripeUrl} rel="noreferrer" target="_blank">
            Start 30-day free trial
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
