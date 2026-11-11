import { AiChatSidebar } from "@/components/ai/AiChatSidebar";
import { DashboardBreadcrumbs } from "@/components/layout/DashboardBreadcrumbs";
import { FloatingActionButtons } from "@/components/layout/FloatingActionButtons";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

// Authenticated app surface: keep out of search indexes. Per-page titles
// still apply through the root "%s | Verdict" template.
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false }
};

export default async function DashboardLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const { user } = await getSession();
  if (!user) {
    redirect("/login");
  }
  if (user.mustChangePassword) {
    redirect("/setup");
  }

  return (
    <div className="bg-background text-foreground flex h-screen overflow-hidden font-sans">
      <Sidebar user={user} />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
          <Header />
          <DashboardBreadcrumbs />
          {children}
        </div>
      </main>
      <AiChatSidebar />
      <FloatingActionButtons />
    </div>
  );
}
