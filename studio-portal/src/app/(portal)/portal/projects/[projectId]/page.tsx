import { requireProjectAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { ClientMilestonesList } from "@/components/milestones/ClientMilestonesList";
import { ActiveSprintDisplay } from "@/components/sprints/ActiveSprintDisplay";
import { ReadOnlyKanbanBoard } from "@/components/kanban/ReadOnlyKanbanBoard";
import { ChangeRequestSection } from "@/components/change-requests/ChangeRequestSection";
import ReactMarkdown from "react-markdown";
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

const updateTypeLabels: Record<string, string> = {
  WEEKLY: "Weekly Update",
  DECISION: "Decision",
  RISK: "Risk",
  LAUNCH: "Launch",
  GENERAL: "Update",
};

const documentTypeIcons: Record<string, string> = {
  SCOPE: "📋",
  SOW: "📄",
  ARCHITECTURE: "🏗️",
  DESIGN: "🎨",
  API: "🔌",
  LAUNCH_CHECKLIST: "✅",
  HANDOFF: "📦",
  OTHER: "📎",
};

const typeLabels: Record<string, string> = {
  BUG: "Bug Fix",
  ENHANCEMENT: "Enhancement",
  NEW_FEATURE: "New Feature",
  CONTENT: "Content Update",
  OTHER: "Other",
};

export default async function PortalProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, project } = await requireProjectAccess(projectId);

  const now = new Date();
  const [milestones, updates, docs, activeSprint, deliverables, sprints] = await Promise.all([
    prisma.milestone.findMany({
      where: { projectId: project.id, clientVisible: true },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    }),
    prisma.projectUpdate.findMany({
      where: { projectId: project.id, clientVisible: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.document.findMany({
      where: { projectId: project.id, clientVisible: true },
      orderBy: { createdAt: "desc" },
      take: 50,
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
    prisma.deliverable.findMany({
      where: { projectId: project.id, clientVisible: true },
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
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-8 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm">
                  {statusLabels[project.status] || project.status}
                </span>
              </div>
              <p className="text-base font-medium text-slate-600 mb-4">{project.client.name}</p>
              {project.description && (
                <p className="text-sm text-slate-700 leading-relaxed max-w-2xl">{project.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-5 bg-white/60 backdrop-blur-sm border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Phase:</span>
              <span className="px-3 py-1.5 rounded-lg font-semibold text-blue-700 bg-blue-100 border border-blue-200">
                {phaseLabels[project.phase] || project.phase}
              </span>
            </div>
            {activeSprintWithProgress && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Active Sprint:</span>
                <span className="px-3 py-1.5 rounded-lg font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200">
                  {activeSprintWithProgress.name}
                </span>
                <span className="text-xs text-slate-600">
                  ({activeSprintWithProgress.completedDeliverables}/{activeSprintWithProgress.totalDeliverables} items • {activeSprintWithProgress.daysRemaining} days left)
                </span>
              </div>
            )}
            {project.startDate && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Started:</span>
                <span className="font-medium text-slate-700">
                  {new Date(project.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            {project.targetLaunchDate && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Target Launch:</span>
                <span className="font-medium text-slate-700">
                  {new Date(project.targetLaunchDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
          {/* Active Sprint Progress Bars - Below the info row */}
          {activeSprintWithProgress && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-slate-600">Time Progress</span>
                    <span className="font-semibold text-slate-900">{activeSprintWithProgress.timeProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${activeSprintWithProgress.timeProgress}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-slate-600">Items Progress</span>
                    <span className="font-semibold text-slate-900">
                      {activeSprintWithProgress.itemsProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${activeSprintWithProgress.itemsProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board - View Only */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Work Board</h2>
              <p className="mt-1 text-sm text-slate-500">
                View-only Kanban board showing all project deliverables
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <ReadOnlyKanbanBoard
            projectId={project.id}
            deliverables={deliverables.map((d) => ({
              ...d,
              dueDate: d.dueDate ? new Date(d.dueDate) : null,
              assignee: d.assignee,
              sprint: d.sprint,
            }))}
            sprints={sprints.map((s) => ({
              id: s.id,
              name: s.name,
              startDate: s.startDate.toISOString(),
              endDate: s.endDate.toISOString(),
            }))}
          />
        </div>
      </section>

      {/* Change Requests Section */}
      <ChangeRequestSection projectId={project.id} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Milestones */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Milestones</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {milestonesWithProgress.length} milestone{milestonesWithProgress.length !== 1 ? "s" : ""} in progress
                </p>
              </div>
              {milestonesWithProgress.length > 5 && (
                <a
                  href={`/portal/projects/${projectId}/milestones`}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  See All →
                </a>
              )}
            </div>
          </div>
          <div className="p-6">
            <ClientMilestonesList milestones={milestonesWithProgress.slice(0, 5)} projectId={project.id} />
          </div>
        </section>

        {/* Right Column - Quick Stats */}
        <div className="space-y-6">
          {/* Quick Stats Card */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Project Overview</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="text-lg">🎯</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Milestones</p>
                    <p className="text-lg font-bold text-slate-900">{milestonesWithProgress.length}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <span className="text-lg">📝</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Updates</p>
                    <p className="text-lg font-bold text-slate-900">{updates.length}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <span className="text-lg">📄</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Documents</p>
                    <p className="text-lg font-bold text-slate-900">{docs.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Updates Section */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Latest Updates</h2>
              <p className="mt-1 text-sm text-slate-500">
                Stay informed about project progress and changes
              </p>
            </div>
            {updates.length > 5 && (
              <a
                href={`/portal/projects/${projectId}/updates`}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                See All →
              </a>
            )}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {updates.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-2xl">📬</span>
              </div>
              <p className="text-sm font-medium text-slate-600">No updates yet</p>
              <p className="mt-1 text-xs text-slate-500">Updates will appear here as the project progresses</p>
            </div>
          ) : (
            updates.slice(0, 5).map((update) => (
              <div key={update.id} className="px-6 py-5 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <span className="text-lg">
                      {update.type === "LAUNCH" ? "🚀" : update.type === "DECISION" ? "💡" : update.type === "RISK" ? "⚠️" : "📢"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {update.title || updateTypeLabels[update.type] || "Update"}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            {updateTypeLabels[update.type] || update.type}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(update.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none text-slate-700 mt-3">
                      <div className="text-sm leading-relaxed">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            h1: ({ children }) => <h1 className="text-base font-semibold mb-2 text-slate-900">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-sm font-semibold mb-2 text-slate-900">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-slate-900">{children}</h3>,
                          }}
                        >
                          {update.body}
                        </ReactMarkdown>
                      </div>
                    </div>
                    {update.externalLinks && update.externalLinks.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {update.externalLinks.map((link, idx) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                          >
                            <span>🔗</span>
                            <span>Open Link</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Documents Section */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
              <p className="mt-1 text-sm text-slate-500">
                {docs.length} document{docs.length !== 1 ? "s" : ""} shared with you
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {docs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
              <p className="text-sm font-medium text-slate-600">No documents shared yet</p>
              <p className="mt-1 text-xs text-slate-500">Documents will appear here when shared</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="group p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-2xl">
                      {documentTypeIcons[doc.type] || "📎"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-2">{doc.title}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-slate-600">{doc.type}</span>
                        {doc.versionLabel && (
                          <>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">{doc.versionLabel}</span>
                          </>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 mb-3">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {doc.externalUrl ? (
                          <a
                            href={doc.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span>Open Link</span>
                          </a>
                        ) : (
                          <>
                            <Link
                              href={`/portal/projects/${projectId}/documents/${doc.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>View</span>
                            </Link>
                            {(doc.content || doc.storageKey) && (
                              <a
                                href={`/api/projects/${projectId}/documents/${doc.id}/export?format=pdf`}
                                download
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Download</span>
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
