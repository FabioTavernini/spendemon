import { Building2 } from 'lucide-react'

import { parseBrandingFromSettings } from '@/lib/settings-config'
import { readSettingsFile } from '@/lib/settings'
import { SidebarMenuItem } from '@/components/ui/sidebar'

export async function CompanyBranding() {
  const content = await readSettingsFile()
  const branding = parseBrandingFromSettings(content)

  if (!branding) return null

  const { companyName, logoUrl } = branding

  return (
    <SidebarMenuItem>
      <div className="mt-1 border-t border-sidebar-border/50 pt-2 flex w-full items-start gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:pt-1">
        <div className="h-4 w-4 shrink-0 mt-0.5 group-data-[collapsible=icon]:mt-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-4 w-4 object-contain" />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
        </div>
        <span className="min-w-0 break-words text-sm font-medium leading-snug group-data-[collapsible=icon]:hidden">
          {companyName}
        </span>
      </div>
    </SidebarMenuItem>
  )
}
