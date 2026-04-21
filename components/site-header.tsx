import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { LogoutButton } from '@/components/auth/logout-button'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth'

export async function SiteHeader({ title = 'Overview' }: Readonly<{ title?: string }>) {
  const session = await auth()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6 mb-2">
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">

          <Button asChild className="shadow-sm text-black dark:text-white" size="sm" variant="outline">
            <Link
              href="https://spendemon.com/docs/intro"
              rel="noreferrer"
              target="_blank"
            >
              Docs
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>

          {session ? <LogoutButton /> : null}
        </div>
      </div>
    </header>
  )
}
