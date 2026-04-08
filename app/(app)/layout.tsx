import { AppSidebar } from '@/components/layout/sidebar/sidebar'
import Footer from '@/components/layout/footer/footer'
import { SidebarProvider } from '@/components/ui/sidebar'
import { requirePageRole } from '@/lib/authorization'

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await requirePageRole('viewer')

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </SidebarProvider>
      <Footer />
    </>
  )
}
