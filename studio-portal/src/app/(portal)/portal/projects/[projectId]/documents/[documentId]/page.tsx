import { requireProjectAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

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

export default async function ClientDocumentPage({
  params,
}: {
  params: Promise<{ projectId: string; documentId: string }>;
}) {
  const { projectId, documentId } = await params;
  const { user, project } = await requireProjectAccess(projectId);

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      projectId: project.id,
      clientVisible: true, // Only show client-visible documents
    },
  });

  if (!document) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-red-900 mb-2">Document Not Found</h1>
          <p className="text-sm text-red-700 mb-4">
            The document you're looking for doesn't exist or isn't available to you.
          </p>
          <Link
            href={`/portal/projects/${projectId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            ← Back to Project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-2xl">
              {documentTypeIcons[document.type] || "📎"}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{document.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-slate-600 px-2 py-1 bg-slate-100 rounded">
                  {document.type}
                </span>
                {document.versionLabel && (
                  <>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{document.versionLabel}</span>
                  </>
                )}
                {document.publishedAt && (
                  <>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">
                      Published {new Date(document.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {document.description && (
            <p className="text-sm text-slate-700 leading-relaxed">{document.description}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <Link
          href={`/portal/projects/${projectId}`}
          className="px-4 py-2 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
        >
          ← Back to Project
        </Link>
        <div className="flex-1" />
        {document.externalUrl ? (
          <a
            href={document.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open External Link
          </a>
        ) : (
          <a
            href={`/api/projects/${projectId}/documents/${documentId}/export?format=pdf`}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </a>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        {document.content ? (
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-4 text-slate-700 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                h1: ({ children }) => <h1 className="text-2xl font-bold text-slate-900 mb-4 mt-6 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold text-slate-900 mb-3 mt-5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-4">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1 text-slate-700">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1 text-slate-700">{children}</ol>,
                li: ({ children }) => <li className="text-slate-700">{children}</li>,
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 bg-slate-100 text-slate-900 rounded text-sm font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-slate-100 p-4 rounded-lg overflow-x-auto mb-4">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 italic text-slate-600 my-4">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {document.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
            <p className="text-sm font-medium text-slate-600">No content available</p>
            <p className="mt-1 text-xs text-slate-500">This document doesn't have any content yet.</p>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="text-xs text-slate-500 text-center">
        Created {new Date(document.createdAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        {document.updatedAt.getTime() !== document.createdAt.getTime() && (
          <> • Last updated {new Date(document.updatedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}</>
        )}
      </div>
    </div>
  );
}

