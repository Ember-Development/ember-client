import { requireInternalUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { InternalRole, ProjectStatus } from ".prisma/client";

export default async function InternalDashboard() {
  const user = await requireInternalUser();
  const isAdmin = user.internalRole === InternalRole.ADMIN;

  const now = new Date();

  // If user is not ADMIN (i.e., OWNER or MEMBER), only show projects they're assigned to
  const whereClause = isAdmin
    ? { tenantId: user.tenantId, status: { in: [ProjectStatus.ACTIVE, ProjectStatus.PLANNING] } }
    : {
        tenantId: user.tenantId,
        status: { in: [ProjectStatus.ACTIVE, ProjectStatus.PLANNING] },
        members: {
          some: {
            userId: user.id,
          },
        },
      };

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: { 
      client: true,
      sprints: {
        where: {
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
        take: 1,
        orderBy: { startDate: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "PLANNING":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "PAUSED":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "BUILD":
        return "text-slate-600";
      case "DESIGN":
        return "text-purple-600";
      case "DISCOVERY":
        return "text-blue-600";
      default:
        return "text-slate-500";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Overview of active and planning projects
        </p>
      </div>

      {/* Projects Section */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Active & Planning Projects</h2>
              <p className="mt-1 text-sm text-slate-500">
                {projects.length} {projects.length === 1 ? "project" : "projects"}
              </p>
            </div>
            <a
              href="/internal/projects"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              View all →
            </a>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {projects.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-4 text-sm font-medium text-slate-900">No projects</h3>
              <p className="mt-2 text-sm text-slate-500">
                Get started by creating your first project or seeding the database.
              </p>
            </div>
          ) : (
            projects.map((p) => (
              <a
                key={p.id}
                href={`/internal/projects/${p.id}`}
                className="block px-6 py-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-slate-700">
                        {p.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(p.status)}`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-600">{p.client.name}</span>
                      <span className="text-slate-400">•</span>
                      <span className={getPhaseColor(p.phase)}>{p.phase}</span>
                    </div>
                    {p.description && (
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                    {p.sprints && p.sprints.length > 0 && (() => {
                      const sprint = p.sprints[0];
                      const totalDeliverables = sprint.deliverables.length;
                      const completedDeliverables = sprint.deliverables.filter((d: any) => d.status === "DONE").length;
                      const itemsProgress = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;
                      const start = new Date(sprint.startDate);
                      const end = new Date(sprint.endDate);
                      const totalDuration = end.getTime() - start.getTime();
                      const elapsed = now.getTime() - start.getTime();
                      const timeProgress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
                      
                      return (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700">{sprint.name}</span>
                            <span className="text-slate-500">
                              {completedDeliverables}/{totalDeliverables} items • {timeProgress}% time
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full"
                                  style={{ width: `${timeProgress}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div
                                  className="bg-emerald-600 h-1.5 rounded-full"
                                  style={{ width: `${itemsProgress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <svg
                    className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </a>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

