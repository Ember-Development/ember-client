import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

const phaseLabels: Record<string, string> = {
  DISCOVERY: "Discovery",
  DESIGN: "Design",
  BUILD: "Build",
  QA: "QA",
  LAUNCH: "Launch",
  SUPPORT: "Support",
};

const statusLabels: Record<string, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETE: "Complete",
  ARCHIVED: "Archived",
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "PLANNING":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "PAUSED":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "COMPLETE":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const getPhaseColor = (phase: string) => {
  switch (phase) {
    case "BUILD":
      return "text-blue-600";
    case "DESIGN":
      return "text-purple-600";
    case "DISCOVERY":
      return "text-indigo-600";
    case "QA":
      return "text-orange-600";
    case "LAUNCH":
      return "text-emerald-600";
    case "SUPPORT":
      return "text-slate-600";
    default:
      return "text-slate-500";
  }
};

export default async function PortalHome() {
  const user = await requireUser();
  const now = new Date();

  // Fetch projects with detailed information
  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    include: {
      project: {
        include: {
          client: true,
          sprints: {
            where: {
              startDate: { lte: now },
              endDate: { gte: now },
            },
            include: {
              deliverables: {
                where: { clientVisible: true },
                select: {
                  id: true,
                  status: true,
                },
              },
            },
            take: 1,
            orderBy: { startDate: "desc" },
          },
          deliverables: {
            where: { clientVisible: true },
            select: {
              id: true,
              status: true,
            },
          },
          updates: {
            where: { clientVisible: true },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              title: true,
              type: true,
              createdAt: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Calculate statistics
  const totalProjects = memberships.length;
  const activeProjects = memberships.filter(
    (m) => m.project.status === "ACTIVE"
  ).length;
  const totalDeliverables = memberships.reduce(
    (sum, m) => sum + m.project.deliverables.length,
    0
  );
  const completedDeliverables = memberships.reduce(
    (sum, m) =>
      sum +
      m.project.deliverables.filter((d) => d.status === "DONE").length,
    0
  );
  const completionRate =
    totalDeliverables > 0
      ? Math.round((completedDeliverables / totalDeliverables) * 100)
      : 0;

  // Get user's name for greeting
  const userName =
    user.firstName || user.email.split("@")[0].replace(/[._]/g, " ");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Welcome back, {userName}!
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Here's an overview of your projects and progress
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Projects</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {totalProjects}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Projects</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">
                {activeProjects}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
              <svg
                className="h-6 w-6 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Items</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {totalDeliverables}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Completion Rate</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {completionRate}%
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
              <svg
                className="h-6 w-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Your Projects</h2>
              <p className="mt-1 text-sm text-slate-500">
                {totalProjects} {totalProjects === 1 ? "project" : "projects"} total
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {memberships.length === 0 ? (
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
              <h3 className="mt-4 text-sm font-medium text-slate-900">
                No projects yet
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                You'll see your projects here once they're assigned to you.
              </p>
            </div>
          ) : (
            memberships.map((m) => {
              const project = m.project;
              const activeSprint = project.sprints[0];
              const totalDeliverables = project.deliverables.length;
              const completedDeliverables = project.deliverables.filter(
                (d) => d.status === "DONE"
              ).length;
              const progress =
                totalDeliverables > 0
                  ? Math.round((completedDeliverables / totalDeliverables) * 100)
                  : 0;

              let sprintProgress = 0;
              let sprintTimeProgress = 0;
              if (activeSprint) {
                const sprintTotal = activeSprint.deliverables.length;
                const sprintCompleted = activeSprint.deliverables.filter(
                  (d) => d.status === "DONE"
                ).length;
                sprintProgress =
                  sprintTotal > 0
                    ? Math.round((sprintCompleted / sprintTotal) * 100)
                    : 0;

                const start = new Date(activeSprint.startDate);
                const end = new Date(activeSprint.endDate);
                const totalDuration = end.getTime() - start.getTime();
                const elapsed = now.getTime() - start.getTime();
                sprintTimeProgress = Math.min(
                  100,
                  Math.max(0, Math.round((elapsed / totalDuration) * 100))
                );
              }

              const latestUpdate = project.updates[0];

              return (
                <Link
                  key={m.projectId}
                  href={`/portal/projects/${m.projectId}`}
                  className="block px-6 py-5 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {project.name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(
                            project.status
                          )}`}
                        >
                          {statusLabels[project.status] || project.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm mb-3">
                        <span className="text-slate-600">{project.client.name}</span>
                        <span className="text-slate-400">•</span>
                        <span className={getPhaseColor(project.phase)}>
                          {phaseLabels[project.phase] || project.phase}
                        </span>
                      </div>

                      {project.description && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                          {project.description}
                        </p>
                      )}

                      {/* Overall Progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-slate-700">
                            Overall Progress
                          </span>
                          <span className="text-slate-500">
                            {completedDeliverables}/{totalDeliverables} items • {progress}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Active Sprint */}
                      {activeSprint && (
                        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-semibold text-blue-900">
                              {activeSprint.name}
                            </span>
                            <span className="text-blue-700">
                              {activeSprint.deliverables.filter((d) => d.status === "DONE")
                                .length}
                              /{activeSprint.deliverables.length} items •{" "}
                              {sprintTimeProgress}% time
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <div className="w-full bg-blue-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full"
                                  style={{ width: `${sprintTimeProgress}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="w-full bg-blue-200 rounded-full h-1.5">
                                <div
                                  className="bg-emerald-600 h-1.5 rounded-full"
                                  style={{ width: `${sprintProgress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Latest Update */}
                      {latestUpdate && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="truncate">
                            {latestUpdate.title || "Latest update"} •{" "}
                            {new Date(latestUpdate.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <svg
                      className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 mt-1"
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
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

