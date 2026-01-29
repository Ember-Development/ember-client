"use client";

import { useState, useEffect } from "react";
import { ArchitectureEditor } from "./ArchitectureEditor";
import { ApiEditor } from "./ApiEditor";
import { RichTextEditor } from "./RichTextEditor";
import { NoteEditor } from "./NoteEditor";
import { DatabaseERDEditor } from "./DatabaseERDEditor";

interface DocumentEditorProps {
  document: {
    id: string;
    title: string | null;
    type: string;
    content: string | null;
    description: string | null;
    versionLabel: string | null;
    clientVisible: boolean;
  };
  projectId: string;
  onSave: (data: { title: string | null; content: string; description: string | null; versionLabel: string | null; clientVisible: boolean }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onExport?: (format: "pdf" | "docx") => Promise<void>;
}

export function DocumentEditor({ document, projectId, onSave, onDelete, onExport }: DocumentEditorProps) {
  const [title, setTitle] = useState(document.title || "");
  const [content, setContent] = useState(document.content || "");
  const [description, setDescription] = useState(document.description || "");
  const [versionLabel, setVersionLabel] = useState(document.versionLabel || "");
  const [clientVisible, setClientVisible] = useState(document.clientVisible);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // For NOTE type, allow empty/null title; for others, require title
      const titleToSave = document.type === "NOTE" 
        ? (title.trim() || null)
        : (title.trim() || document.title || "Untitled");
      
      await onSave({
        title: titleToSave,
        content,
        description: description || null,
        versionLabel: versionLabel || null,
        clientVisible,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (typeof window !== "undefined" && window.document.documentElement.requestFullscreen) {
        window.document.documentElement.requestFullscreen();
      }
    } else {
      setIsFullscreen(false);
      if (typeof window !== "undefined" && window.document.exitFullscreen) {
        window.document.exitFullscreen();
      }
    }
  };

  return (
    <div className={`flex flex-col ${isFullscreen ? "fixed inset-0 z-50 rounded-none" : "h-[calc(100vh-200px)] rounded-2xl"} bg-white border border-slate-200 shadow-sm overflow-hidden`}>
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          {document.type === "ARCHITECTURE" && (
            <span className="text-sm text-slate-600">Architecture Diagram</span>
          )}
          {document.type === "API" && (
            <span className="text-sm text-slate-600">API Documentation</span>
          )}
          {document.type === "NOTE" && (
            <span className="text-sm text-slate-600">Project Notes</span>
          )}
          {document.type === "DATABASE_ERD" && (
            <span className="text-sm text-slate-600">Database ERD</span>
          )}
          {!["ARCHITECTURE", "API", "NOTE", "DATABASE_ERD"].includes(document.type) && (
            <span className="text-sm text-slate-600">Rich Text Editor</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onExport && (
            <>
              <div className="relative group">
                <button className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors">
                  Export
                </button>
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => onExport("pdf")}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-t-lg"
                  >
                    Export as PDF
                  </button>
                  <button
                    onClick={() => onExport("docx")}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-b-lg"
                  >
                    Export as DOCX
                  </button>
                </div>
              </div>
              <div className="w-px h-6 bg-slate-300 mx-1" />
            </>
          )}
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1" />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              className="rounded border-slate-300"
            />
            Client-visible
          </label>
          {onDelete && (
            <button
              onClick={async () => {
                if (confirm("Are you sure you want to delete this document?")) {
                  await onDelete();
                }
              }}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Document Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <input
          type="text"
          value={title || ""}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={document.type === "NOTE" ? "Note title (optional)" : "Document title"}
          className="w-full text-lg font-semibold bg-transparent border-none focus:outline-none text-slate-900"
        />
        <div className="flex items-center gap-4 mt-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1 text-sm bg-transparent border-none focus:outline-none text-slate-600 placeholder:text-slate-400"
          />
          <input
            type="text"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            placeholder="Version (e.g., 1.0)"
            className="w-24 text-sm bg-transparent border-none focus:outline-none text-slate-600 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Specialized Editors */}
      <div className="flex-1 overflow-hidden">
        {document.type === "ARCHITECTURE" ? (
          <ArchitectureEditor content={content} onChange={setContent} />
        ) : document.type === "API" ? (
          <ApiEditor content={content} onChange={setContent} />
        ) : document.type === "NOTE" ? (
          <NoteEditor content={content} onChange={setContent} />
        ) : document.type === "DATABASE_ERD" ? (
          <DatabaseERDEditor content={content} onChange={setContent} />
        ) : (
          <RichTextEditor content={content} onChange={setContent} />
        )}
      </div>
    </div>
  );
}

