import { requireProjectAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const updateTypeLabels: Record<string, string> = {
  WEEKLY: "Weekly Update",
  DECISION: "Decision",
  RISK: "Risk",
  LAUNCH: "Launch",
  GENERAL: "Update",
};

export default async function PortalUpdatesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user, project } = await requireProjectAccess(projectId);

  const updates = await prisma.projectUpdate.findMany({
    where: { projectId: project.id, clientVisible: true },
    orderBy: { createdAt: "desc" },
  });

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
                <p className="text-xs text-slate-500">Project Updates</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">All Updates</h2>
          <p className="mt-1 text-sm text-slate-600">
            {updates.length} {updates.length === 1 ? "update" : "updates"} total
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {updates.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-2xl">📬</span>
              </div>
              <p className="text-sm font-medium text-slate-600">No updates yet</p>
              <p className="mt-1 text-xs text-slate-500">Updates will appear here as the project progresses</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {updates.map((update) => (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

