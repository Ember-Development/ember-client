"use client";

import { useState } from "react";
import { documentTemplates, DocumentTemplate } from "@/lib/documents/templates";
import { DocumentType } from ".prisma/client";

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: DocumentTemplate) => void;
  projectId: string;
}

export function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  const [selectedType, setSelectedType] = useState<DocumentType | "ALL">("ALL");

  if (!isOpen) return null;

  const filteredTemplates = documentTemplates.filter(
    (t) => selectedType === "ALL" || t.type === selectedType
  );

  const getTypeColor = (type: DocumentType) => {
    switch (type) {
      case "SCOPE":
        return "bg-blue-100 text-blue-700";
      case "SOW":
        return "bg-purple-100 text-purple-700";
      case "ARCHITECTURE":
        return "bg-emerald-100 text-emerald-700";
      case "DESIGN":
        return "bg-pink-100 text-pink-700";
      case "API":
        return "bg-amber-100 text-amber-700";
      case "LAUNCH_CHECKLIST":
        return "bg-indigo-100 text-indigo-700";
      case "NOTE":
        return "bg-yellow-100 text-yellow-700";
      case "DATABASE_ERD":
        return "bg-cyan-100 text-cyan-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Create Document</h2>
            <p className="mt-1 text-sm text-slate-600">Choose a template to get started</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-200">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as DocumentType | "ALL")}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="ALL">All Templates</option>
            <option value="SCOPE">Scope Documents</option>
            <option value="SOW">Statement of Work</option>
            <option value="ARCHITECTURE">Architecture</option>
            <option value="DESIGN">Design</option>
            <option value="API">API Documentation</option>
            <option value="LAUNCH_CHECKLIST">Launch Checklist</option>
            <option value="NOTE">Notes</option>
            <option value="DATABASE_ERD">Database ERD</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  onSelect(template);
                  onClose();
                }}
                className="text-left p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all bg-white"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-semibold text-slate-900">{template.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${getTypeColor(template.type)}`}>
                    {template.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{template.description}</p>
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-slate-500">No templates found for this type.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

