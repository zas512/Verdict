import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { MatterDetail } from "@/components/matters/MatterDetail";
import { getSession } from "@/lib/session";

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
