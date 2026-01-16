import { requireProjectAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { ClientMilestonesList } from "@/components/milestones/ClientMilestonesList";
import Link from "next/link";

export default async function PortalMilestonesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user, project } = await requireProjectAccess(projectId);

  const milestones = await prisma.milestone.findMany({
    where: { projectId: project.id, clientVisible: true },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
  });

  // Calculate progress for milestones
  const milestonesWithProgress = await Promise.all(
    milestones.map(async (milestone) => {
      const deliverables = await prisma.deliverable.findMany({
        where: { milestoneId: milestone.id },
      });

      const progress =
        deliverables.length > 0
          ? Math.round(
              (deliverables.filter((d) => d.status === "DONE").length / deliverables.length) * 100
            )
          : null;

      return {
        ...milestone,
        progress,
        deliverablesCount: deliverables.length,
        completedDeliverablesCount: deliverables.filter((d) => d.status === "DONE").length,
        dueDate: milestone.dueDate?.toISOString() || null,
        createdAt: milestone.createdAt.toISOString(),
        updatedAt: milestone.updatedAt.toISOString(),
      };
    })
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/portal/projects/${projectId}`}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                ← Back to Project
              </Link>
              <div className="h-4 w-px bg-slate-300" />
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{project.name}</h1>
                <p className="text-xs text-slate-500">Milestones</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">All Milestones</h2>
          <p className="mt-1 text-sm text-slate-600">
            {milestonesWithProgress.length} {milestonesWithProgress.length === 1 ? "milestone" : "milestones"} total
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <ClientMilestonesList milestones={milestonesWithProgress} projectId={project.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

