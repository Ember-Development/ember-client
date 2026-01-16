import { requireProjectAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { UserType, InternalRole } from ".prisma/client";
import { SprintManagement } from "@/components/sprints/SprintManagement";
import { DeliverablesView } from "@/components/kanban/DeliverablesView";
import { PhaseSelector } from "@/components/projects/PhaseSelector";
import { ChangeRequestReview } from "@/components/change-requests/ChangeRequestReview";
import Link from "next/link";

type PricingModel = "HOURLY" | "FIXED_PRICE" | "RETAINER" | "MILESTONE_BASED" | "TBD";

function formatPricingInfo(project: {
  pricingModel: PricingModel | null;
  hourlyRateCents: number | null;
  weeklyCapacityHours: number | null;
  fixedPriceCents: number | null;
  retainerAmountCents: number | null;
  retainerFrequency: string | null;
  pricingNotes: string | null;
}) {
  if (!project.pricingModel || project.pricingModel === "TBD") {
    return "TBD";
  }

  switch (project.pricingModel) {
    case "HOURLY":
      if (project.hourlyRateCents && project.weeklyCapacityHours) {
        const base = `$${(project.hourlyRateCents / 100).toFixed(2)}/hr • ${project.weeklyCapacityHours}h/week`;
        return project.pricingNotes ? `${base} • See notes` : base;
      } else if (project.hourlyRateCents) {
        const base = `$${(project.hourlyRateCents / 100).toFixed(2)}/hr`;
        return project.pricingNotes ? `${base} • See notes` : base;
      }
      return project.pricingNotes ? "Hourly (rate TBD) • See notes" : "Hourly (rate TBD)";
    
    case "FIXED_PRICE":
      if (project.fixedPriceCents) {
        const base = `$${(project.fixedPriceCents / 100).toLocaleString()}`;
        return project.pricingNotes ? `${base} • See notes` : base;
      }
      return project.pricingNotes ? "Fixed Price (amount TBD) • See notes" : "Fixed Price (amount TBD)";
    
    case "RETAINER":
      if (project.retainerAmountCents) {
        const frequency = project.retainerFrequency?.toLowerCase() || "period";
        const base = `$${(project.retainerAmountCents / 100).toLocaleString()}/${frequency}`;
        return project.pricingNotes ? `${base} • See notes` : base;
      }
      return project.pricingNotes ? "Retainer (amount TBD) • See notes" : "Retainer (amount TBD)";
    
    case "MILESTONE_BASED":
      return "Milestone-Based" + (project.pricingNotes ? ` • See notes` : "");
    
    default:
      return project.pricingNotes || "TBD";
  }
}

export default async function InternalProjectDetail({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, project } = await requireProjectAccess(projectId);

  // internal-only page, but requireProjectAccess handles internal too
  if (user.userType !== UserType.INTERNAL) return null;

  const isAdmin = user.internalRole === InternalRole.ADMIN || user.internalRole === InternalRole.OWNER;

  const [milestones, updates, docs, changeRequests, deliverables, projectMembers, sprints] = await Promise.all([
    prisma.milestone.findMany({
      where: { projectId: project.id },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.projectUpdate.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.document.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.changeRequest.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
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
    prisma.sprint.findMany({
      where: { projectId: project.id },
      orderBy: { startDate: "desc" },
    }),
  ]);

  // Calculate progress for milestones
  const milestonesWithProgress = await Promise.all(
    milestones.map(async (milestone) => {
      const milestoneDeliverables = await prisma.deliverable.findMany({
        where: { milestoneId: milestone.id },
      });

      const progress =
        milestoneDeliverables.length > 0
          ? Math.round(
              (milestoneDeliverables.filter((d) => d.status === "DONE").length /
                milestoneDeliverables.length) *
                100
            )
          : null;

      return {
        ...milestone,
        progress,
        deliverablesCount: milestoneDeliverables.length,
        completedDeliverablesCount: milestoneDeliverables.filter((d) => d.status === "DONE").length,
        approvalStatus: milestone.approvalStatus,
        approvalNotes: milestone.approvalNotes,
      };
    })
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DONE":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "BLOCKED":
        return "bg-red-100 text-red-700 border-red-200";
      case "NOT_STARTED":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getChangeRequestStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "SHIPPED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "NEW":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "DECLINED":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "text-red-600";
      case "HIGH":
        return "text-orange-600";
      case "MED":
        return "text-amber-600";
      case "LOW":
        return "text-slate-600";
      default:
        return "text-slate-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-6 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{project.name}</h1>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-blue-100 text-blue-700 border-blue-200">
                  {project.status}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-600">{project.client.name}</p>
              {project.description && (
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {isAdmin && (
                <Link
                  href={`/internal/projects/${project.id}/edit`}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Project
                </Link>
              )}
              <a
                href="/internal/projects"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                ← Back
              </a>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <div className="flex items-center">
              <span className="text-slate-500">Phase:</span>
              <PhaseSelector projectId={project.id} currentPhase={project.phase} />
            </div>
            <div>
              <span className="text-slate-500">Pricing:</span>
              <span className="ml-2 font-medium text-slate-700">
                {formatPricingInfo({
                  pricingModel: (project as any).pricingModel ?? null,
                  hourlyRateCents: (project as any).hourlyRateCents ?? null,
                  weeklyCapacityHours: (project as any).weeklyCapacityHours ?? null,
                  fixedPriceCents: (project as any).fixedPriceCents ?? null,
                  retainerAmountCents: (project as any).retainerAmountCents ?? null,
                  retainerFrequency: (project as any).retainerFrequency ?? null,
                  pricingNotes: (project as any).pricingNotes ?? null,
                })}
              </span>
            </div>
            {project.startDate && (
              <div>
                <span className="text-slate-500">Started:</span>
                <span className="ml-2 font-medium text-slate-700">
                  {new Date(project.startDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {project.targetLaunchDate && (
              <div>
                <span className="text-slate-500">Target Launch:</span>
                <span className="ml-2 font-medium text-slate-700">
                  {new Date(project.targetLaunchDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Grid: Sprint Management and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sprint Management - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Sprint Management</h2>
              <p className="mt-1 text-sm text-slate-500">
                Track 2-week work cycles and monitor progress
              </p>
            </div>
            <div className="p-6">
              <SprintManagement projectId={project.id} />
            </div>
          </section>
        </div>

        {/* Quick Stats - Takes 1 column on large screens */}
        <div className="space-y-6">
          {/* Quick Stats Card */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Quick Stats</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Milestones</span>
                  <span className="text-sm font-semibold text-slate-900">{milestonesWithProgress.length}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Deliverables</span>
                  <span className="text-sm font-semibold text-slate-900">{deliverables.length}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Documents</span>
                  <span className="text-sm font-semibold text-slate-900">{docs.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Change Requests</span>
                  <span className="text-sm font-semibold text-slate-900">{changeRequests.length}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Links */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Quick Links</h2>
            </div>
            <div className="p-6 space-y-2">
              <a
                href={`/internal/projects/${project.id}/kanban`}
                className="block px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Full Kanban Board →
              </a>
              <a
                href={`/internal/projects/${project.id}/milestones`}
                className="block px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Manage Milestones →
              </a>
              <a
                href={`/internal/projects/${project.id}/documents`}
                className="block px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                View Documents →
              </a>
            </div>
          </section>
        </div>
      </div>

      {/* Deliverables View (Kanban/List Toggle) */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <a
              href={`/internal/projects/${project.id}/kanban`}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Open Full Screen →
            </a>
          </div>
        </div>
        <div className="p-6">
          <DeliverablesView
            projectId={project.id}
            initialDeliverables={deliverables.map((d) => ({
              ...d,
              dueDate: d.dueDate ? new Date(d.dueDate) : null,
              assignee: d.assignee,
              sprint: d.sprint,
            }))}
            projectMembers={projectMembers
              .filter((pm) => pm.user && pm.user.userType === "INTERNAL")
              .map((pm) => ({
                id: pm.user!.id,
                email: pm.user!.email,
                firstName: pm.user!.firstName,
                lastName: pm.user!.lastName,
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Milestones */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Milestones</h2>
              <p className="mt-1 text-sm text-slate-500">{milestonesWithProgress.length} total</p>
            </div>
            <a
              href={`/internal/projects/${project.id}/milestones`}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              View All →
            </a>
          </div>
          <div className="divide-y divide-slate-100">
            {milestonesWithProgress.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500">
                No milestones yet.
              </div>
            ) : (
              milestonesWithProgress.slice(0, 5).map((m) => (
                <div key={m.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">{m.title}</h3>
                      {m.description && (
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{m.description}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border shrink-0 ${getStatusColor(m.status)}`}
                    >
                      {m.status}
                    </span>
                  </div>
                  {m.progress !== null && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              m.progress >= 67
                                ? "bg-emerald-500"
                                : m.progress >= 34
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${m.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600 font-medium min-w-[40px] text-right">
                          {m.progress}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {m.completedDeliverablesCount} of {m.deliverablesCount} deliverables completed
                      </p>
                    </div>
                  )}
                  {m.requiresClientApproval && m.approvalStatus && (
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                          m.approvalStatus === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : m.approvalStatus === "CHANGES_REQUESTED"
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {m.approvalStatus === "PENDING"
                          ? "Pending Approval"
                          : m.approvalStatus === "APPROVED"
                          ? "Approved"
                          : "Changes Requested"}
                      </span>
                    </div>
                  )}
                  {m.dueDate && (
                    <p className="mt-2 text-xs text-slate-500">
                      Due: {new Date(m.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Latest Updates */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Latest Updates</h2>
              <p className="mt-1 text-sm text-slate-500">{updates.length} recent</p>
            </div>
            {updates.length > 5 && (
              <a
                href={`/internal/projects/${project.id}/updates`}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                See All →
              </a>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {updates.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500">
                No updates yet.
              </div>
            ) : (
              updates.slice(0, 5).map((u) => (
                <div key={u.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-slate-900">{u.title ?? u.type}</h3>
                    <span className="text-xs text-slate-500 shrink-0">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-3">{u.body}</p>
                  {u.externalLinks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {u.externalLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          Link {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Documents */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
              <p className="mt-1 text-sm text-slate-500">{docs.length} total</p>
            </div>
            <a
              href={`/internal/projects/${project.id}/documents`}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              View All →
            </a>
          </div>
          <div className="divide-y divide-slate-100">
            {docs.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500">
                No documents yet.
              </div>
            ) : (
              docs.map((d) => (
                <div key={d.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">{d.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                        <span>{d.type}</span>
                        <span className="text-slate-400">•</span>
                        <span className={d.clientVisible ? "text-emerald-600" : "text-slate-500"}>
                          {d.clientVisible ? "Client-visible" : "Internal"}
                        </span>
                      </div>
                      {d.versionLabel && (
                        <span className="mt-1 inline-block text-xs text-slate-500">
                          Version: {d.versionLabel}
                        </span>
                      )}
                    </div>
                    <a
                      href={d.externalUrl || `/internal/projects/${project.id}/documents/${d.id}`}
                      target={d.externalUrl ? "_blank" : undefined}
                      rel={d.externalUrl ? "noopener noreferrer" : undefined}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 shrink-0"
                    >
                      {d.externalUrl ? "Open →" : "Edit →"}
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Change Requests */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Change Requests</h2>
            <p className="mt-1 text-sm text-slate-500">{changeRequests.length} total</p>
          </div>
          <div className="p-6">
            <ChangeRequestReview
              projectId={project.id}
              changeRequests={changeRequests.map((cr) => ({
                ...cr,
                createdAt: cr.createdAt.toISOString(),
                updatedAt: cr.updatedAt.toISOString(),
                newProjectDueDate: cr.newProjectDueDate?.toISOString() || null,
                author: cr.author,
              }))}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

