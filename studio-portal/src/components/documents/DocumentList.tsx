"use client";

import { useState } from "react";
import { DocumentType } from ".prisma/client";

interface Document {
  id: string;
  title: string;
  type: DocumentType;
  description: string | null;
  versionLabel: string | null;
  clientVisible: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentListProps {
  documents: Document[];
  projectId: string;
}

export function DocumentList({ documents, projectId }: DocumentListProps) {
  const [filterType, setFilterType] = useState<DocumentType | "ALL">("ALL");
  const [filterVisibility, setFilterVisibility] = useState<"ALL" | "CLIENT" | "INTERNAL">("ALL");

  const filteredDocuments = documents.filter((doc) => {
    if (filterType !== "ALL" && doc.type !== filterType) return false;
    if (filterVisibility === "CLIENT" && !doc.clientVisible) return false;
    if (filterVisibility === "INTERNAL" && doc.clientVisible) return false;
    return true;
  });

  const getTypeColor = (type: DocumentType) => {
    switch (type) {
      case "SCOPE":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "SOW":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "ARCHITECTURE":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "DESIGN":
        return "bg-pink-100 text-pink-700 border-pink-200";
      case "API":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "LAUNCH_CHECKLIST":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "HANDOFF":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as DocumentType | "ALL")}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="ALL">All Types</option>
            <option value="SCOPE">Scope</option>
            <option value="SOW">SOW</option>
            <option value="ARCHITECTURE">Architecture</option>
            <option value="DESIGN">Design</option>
            <option value="API">API</option>
            <option value="LAUNCH_CHECKLIST">Launch Checklist</option>
            <option value="HANDOFF">Handoff</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Visibility</label>
          <select
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value as typeof filterVisibility)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="ALL">All</option>
            <option value="CLIENT">Client-Visible</option>
            <option value="INTERNAL">Internal Only</option>
          </select>
        </div>
        <div className="flex-1" />
        <div className="text-sm text-slate-600">
          {filteredDocuments.length} {filteredDocuments.length === 1 ? "document" : "documents"}
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((doc) => (
          <a
            key={doc.id}
            href={`/internal/projects/${projectId}/documents/${doc.id}`}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-slate-700 flex-1">
                {doc.title}
              </h3>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border shrink-0 ${getTypeColor(doc.type)}`}
              >
                {doc.type}
              </span>
            </div>
            {doc.description && (
              <p className="text-xs text-slate-600 line-clamp-2 mb-3">{doc.description}</p>
            )}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-3">
                {doc.versionLabel && <span>v{doc.versionLabel}</span>}
                {doc.clientVisible && (
                  <span className="text-emerald-600">Client-visible</span>
                )}
              </div>
              <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
            </div>
          </a>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
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
          <h3 className="mt-4 text-sm font-medium text-slate-900">No documents</h3>
          <p className="mt-2 text-sm text-slate-500">
            Get started by creating your first document.
          </p>
        </div>
      )}
    </div>
  );
}

