import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { MatterDetail } from "@/components/matters/MatterDetail";
import { backendFetch } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import type { Metadata } from "next";

interface MatterSummary {
  firmCaseNumber?: string;
  clientName?: string;
}

export async function generateMetadata({
  params
}: Readonly<{
  params: Promise<{ id: string }>;
}>): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await backendFetch(`/matters/${id}`);
    if (res.ok) {
      const matter = (await res.json().catch(() => null)) as MatterSummary | null;
      const label = matter?.firmCaseNumber ?? matter?.clientName;
      if (label) {
        return {
          title: `Matter ${label}`,
          description: `Matter ${label} — case details, documents, hearings, and tasks in Verdict.`,
          alternates: { canonical: `/matters/${id}` }
        };
      }
    }
  } catch {
    // Fall through: generic authenticated title.
  }
  return {
    title: "Matter Details",
    description: "Matter case file: details, documents, hearings, and tasks.",
    alternates: { canonical: `/matters/${id}` }
  };
}

export default async function MatterDetailPage({
  params
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { user } = await getSession();
  const { id } = await params;

  return (
    <div className="space-y-6">
      <HeaderUpdater title="Matter Details Workspace" />
      <MatterDetail id={id} userRole={user?.role} userId={user?.sub} />
    </div>
  );
}
