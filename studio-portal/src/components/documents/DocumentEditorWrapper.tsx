"use client";

import { useRouter } from "next/navigation";
import { DocumentEditor } from "./DocumentEditor";

interface DocumentEditorWrapperProps {
  document: {
    id: string;
    title: string;
    type: string;
    content: string | null;
    description: string | null;
    versionLabel: string | null;
    clientVisible: boolean;
  };
  projectId: string;
  documentId: string;
}

export function DocumentEditorWrapper({
  document,
  projectId,
  documentId,
}: DocumentEditorWrapperProps) {
  const router = useRouter();

  const handleSave = async (data: {
    title: string;
    content: string;
    description: string | null;
    versionLabel: string | null;
    clientVisible: boolean;
  }) => {
    const response = await fetch(`/api/projects/${projectId}/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save document");
    }

    router.refresh();
  };

  const handleDelete = async () => {
    const response = await fetch(`/api/projects/${projectId}/documents/${documentId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete document");
    }

    router.push(`/internal/projects/${projectId}/documents`);
  };

  const handleExport = async (format: "pdf" | "docx") => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${documentId}/export?format=${format}`
      );

      if (!response.ok) {
        throw new Error("Failed to export document");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.title}.${format}`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export document. Please try again.");
    }
  };

  return (
    <DocumentEditor
      document={document}
      projectId={projectId}
      onSave={handleSave}
      onDelete={handleDelete}
      onExport={handleExport}
    />
  );
}

