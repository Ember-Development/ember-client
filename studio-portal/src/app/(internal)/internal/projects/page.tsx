import { requireInternalUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { InternalRole } from ".prisma/client";
import Link from "next/link";

export default async function InternalProjectsPage() {
  const user = await requireInternalUser();
  const isAdmin = user.internalRole === InternalRole.ADMIN || user.internalRole === InternalRole.OWNER;

  const projects = await prisma.project.findMany({
    where: { tenantId: user.tenantId },
    include: { client: true },
    orderBy: { updatedAt: "desc" },
  });

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
      case "ARCHIVED":
        return "bg-slate-100 text-slate-500 border-slate-200";
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
      case "LAUNCH":
        return "text-emerald-600";
      case "QA":
        return "text-amber-600";
      case "SUPPORT":
        return "text-blue-600";
      default:
        return "text-slate-500";
    }
  };

  // Group projects by status
  const projectsByStatus = {
    ACTIVE: projects.filter((p) => p.status === "ACTIVE"),
    PLANNING: projects.filter((p) => p.status === "PLANNING"),
    PAUSED: projects.filter((p) => p.status === "PAUSED"),
    COMPLETE: projects.filter((p) => p.status === "COMPLETE"),
    ARCHIVED: projects.filter((p) => p.status === "ARCHIVED"),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Projects</h1>
          <p className="mt-2 text-sm text-slate-600">
            {projects.length} {projects.length === 1 ? "project" : "projects"} in your workspace
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/internal/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Project
          </Link>
        )}
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-6 py-16 text-center">
            <svg
              className="mx-auto h-16 w-16 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-slate-900">No projects yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Get started by creating your first project.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <a
              key={p.id}
              href={`/internal/projects/${p.id}`}
              className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700 line-clamp-2 flex-1">
                    {p.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border shrink-0 ${getStatusColor(p.status)}`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600 font-medium">{p.client.name}</span>
                  <span className="text-slate-300">•</span>
                  <span className={`font-medium ${getPhaseColor(p.phase)}`}>{p.phase}</span>
                </div>
              </div>

              {/* Card Body */}
              {p.description && (
                <div className="px-5 pb-4 flex-1">
                  <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              )}

              {/* Card Footer */}
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <svg
                    className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors"
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
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

