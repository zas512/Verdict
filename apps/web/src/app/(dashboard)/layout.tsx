import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function DashboardLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const { user } = await getSession();
  if (!user) {
    redirect("/login");
  }
  // First login: the provisioned password must be replaced before the app opens.
  if (user.mustChangePassword) {
    redirect("/setup");
  }

  return (
    <div className="bg-background text-foreground flex h-screen overflow-hidden font-sans">
      {/* Fixed Left Sidebar */}
      <Sidebar user={user} />

      {/* Main Right Content Area */}
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
          <Header />
          {children}
        </div>
      </main>
    </div>
  );
}
