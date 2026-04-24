import { AppSidebar } from "@/components/layout/sidebar/sidebar";
import Footer from "@/components/layout/footer/footer";
import { LicenseBanner } from "@/components/license-banner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { requirePageRole } from "@/lib/authorization";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requirePageRole("viewer");

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <LicenseBanner />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
        <Footer />
      </div>
    </SidebarProvider>
  );
}
