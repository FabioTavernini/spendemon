import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { getClusters } from '@/lib/clusters'
import { Button } from '@/components/ui/button'

const STRIPE_TEAMS = 'https://buy.stripe.com/test_4gM7sMcR5bvCdjUaC85Rm06'
const STRIPE_UNLIMITED = 'https://buy.stripe.com/test_3cIbJ2g3h57e4No25C5Rm07'

export async function LicenseBanner() {
  const clusters = await getClusters()
  if (clusters.length < 5) return null

  const stripeUrl = clusters.length <= 5 ? STRIPE_TEAMS : STRIPE_UNLIMITED
  const planLabel = clusters.length <= 5 ? 'team license' : 'unlimited license'

  return (
    <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
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
            Subscribe
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
