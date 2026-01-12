import { requireProjectAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { UserType } from ".prisma/client";
import { DeliverablesView } from "@/components/kanban/DeliverablesView";
import { ActiveSprintDisplay } from "@/components/sprints/ActiveSprintDisplay";

export default async function KanbanPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, project } = await requireProjectAccess(projectId);

  if (user.userType !== UserType.INTERNAL) return null;

  const now = new Date();
  const [deliverables, projectMembers, activeSprint, sprints] = await Promise.all([
    prisma.deliverable.findMany({
      where: { projectId: project.id },
      orderBy: { orderIndex: "asc" },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        sprint: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId: project.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userType: true,
          },
        },
      },
    }),
    prisma.sprint.findFirst({
      where: {
        projectId: project.id,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        deliverables: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.sprint.findMany({
      where: { projectId: project.id },
      orderBy: { startDate: "desc" },
    }),
  ]);

  // Calculate progress for active sprint
  let activeSprintWithProgress = null;
  if (activeSprint) {
    const start = new Date(activeSprint.startDate);
    const end = new Date(activeSprint.endDate);
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const timeProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    const totalDeliverables = activeSprint.deliverables.length;
    const completedDeliverables = activeSprint.deliverables.filter(
      (d) => d.status === "DONE"
    ).length;
    const itemsProgress =
      totalDeliverables > 0
        ? Math.round((completedDeliverables / totalDeliverables) * 100)
        : 0;

    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    activeSprintWithProgress = {
      ...activeSprint,
      startDate: activeSprint.startDate.toISOString(),
      endDate: activeSprint.endDate.toISOString(),
      timeProgress: Math.round(timeProgress),
      itemsProgress,
      totalDeliverables,
      completedDeliverables,
      daysRemaining: Math.max(0, daysRemaining),
    };
  }

  // Filter to only internal users
  const internalMembers = projectMembers
    .filter((pm) => pm.user && pm.user.userType === "INTERNAL")
    .map((pm) => ({
      id: pm.user!.id,
      email: pm.user!.email,
      firstName: pm.user!.firstName,
      lastName: pm.user!.lastName,
    }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-[1920px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href={`/internal/projects/${project.id}`}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                ← Back to Project
              </a>
              <div className="h-4 w-px bg-slate-300" />
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{project.name}</h1>
                <p className="text-xs text-slate-500">Kanban Board</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1920px] p-6">
        {/* Active Sprint Display */}
        {activeSprintWithProgress && (
          <div className="mb-6">
            <ActiveSprintDisplay sprint={activeSprintWithProgress} />
          </div>
        )}

        <DeliverablesView
          projectId={project.id}
          initialDeliverables={deliverables.map(d => ({
            ...d,
            dueDate: d.dueDate ? new Date(d.dueDate) : null,
            assignee: d.assignee,
            sprint: d.sprint,
          }))}
          projectMembers={internalMembers}
          sprints={sprints.map((s) => ({
            id: s.id,
            name: s.name,
            startDate: s.startDate.toISOString(),
            endDate: s.endDate.toISOString(),
          }))}
          defaultView="kanban"
        />
      </div>
    </div>
  );
}

