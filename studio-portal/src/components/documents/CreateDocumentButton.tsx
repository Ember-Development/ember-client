"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TemplateSelector } from "./TemplateSelector";
import { DocumentTemplate } from "@/lib/documents/templates";

interface CreateDocumentButtonProps {
  projectId: string;
}

export function CreateDocumentButton({ projectId }: CreateDocumentButtonProps) {
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const router = useRouter();

  const handleTemplateSelect = async (template: DocumentTemplate) => {
    try {
      // Generate document from template
      const response = await fetch(`/api/projects/${projectId}/documents/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("API Error:", errorData);
        throw new Error(errorData.error || `Failed to create document: ${response.status}`);
      }

      const document = await response.json();
      router.push(`/internal/projects/${projectId}/documents/${document.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error creating document:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create document. Please try again.";
      alert(errorMessage);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsTemplateSelectorOpen(true)}
        className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
      >
        + Create Document
      </button>
      <TemplateSelector
        isOpen={isTemplateSelectorOpen}
        onClose={() => setIsTemplateSelectorOpen(false)}
        onSelect={handleTemplateSelect}
        projectId={projectId}
      />
    </>
  );
}

