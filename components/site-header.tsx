import { Button } from "@/components/ui/button"
import Link from "next/link"
export function SiteHeader({ title = "Overview" }: { title?: string }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6 mb-2">
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">

          <Link href={"/wiki"} >

            <Button variant="outline" size="sm" className="hover:cursor-pointer">
              Wiki
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
