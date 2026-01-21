"use client";

import { useState, useEffect } from "react";
import { EpicCard } from "./EpicCard";
import { EpicEditor } from "./EpicEditor";

interface Epic {
  id: string;
  title: string;
  description: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: "LOW" | "MED" | "HIGH" | "URGENT";
  assigneeId: string | null;
  assignee: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  dueDate: string | null;
  clientVisible: boolean;
  deliverableCount?: number;
}

interface ProjectMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface EpicManagementProps {
  projectId: string;
  projectMembers: ProjectMember[];
}

export function EpicManagement({ projectId, projectMembers }: EpicManagementProps) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEpics = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/epics`);
      if (response.ok) {
        const data = await response.json();
        setEpics(data.epics || []);
      }
    } catch (error) {
      console.error("Failed to fetch epics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpics();
  }, [projectId]);

  const handleCreate = () => {
    setEditingEpic(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (epic: Epic) => {
    setEditingEpic(epic);
    setIsEditorOpen(true);
  };

  const handleSave = async (data: {
    title: string;
    description: string | null;
    status: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "CANCELLED";
    priority: "LOW" | "MED" | "HIGH" | "URGENT";
    assigneeId: string | null;
    dueDate: string | null;
    clientVisible: boolean;
  }) => {
    try {
      if (editingEpic) {
        // Update
        const response = await fetch(`/api/projects/${projectId}/epics/${editingEpic.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update epic");
        }
      } else {
        // Create
        const response = await fetch(`/api/projects/${projectId}/epics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create epic");
        }
      }
      setIsEditorOpen(false);
      setEditingEpic(null);
      fetchEpics();
    } catch (error) {
      console.error("Failed to save epic:", error);
      alert(error instanceof Error ? error.message : "Failed to save epic");
    }
  };

  const handleDelete = async () => {
    if (!editingEpic) return;
    if (!confirm(`Are you sure you want to delete "${editingEpic.title}"?`)) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/epics/${editingEpic.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete epic");
      }
      setIsEditorOpen(false);
      setEditingEpic(null);
      fetchEpics();
    } catch (error) {
      console.error("Failed to delete epic:", error);
      alert(error instanceof Error ? error.message : "Failed to delete epic");
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading epics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Epic Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Epics</h3>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Create Epic
          </button>
        </div>

        {epics.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
            No epics yet. Create your first epic to organize deliverables.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {epics.map((epic) => (
              <EpicCard
                key={epic.id}
                epic={epic}
                onEdit={() => handleEdit(epic)}
                onDelete={() => {
                  setEditingEpic(epic);
                  handleDelete();
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Epic Editor Modal */}
      {isEditorOpen && (
        <EpicEditor
          epic={editingEpic}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingEpic(null);
          }}
          onSave={handleSave}
          onDelete={editingEpic ? handleDelete : undefined}
          projectMembers={projectMembers}
        />
      )}
    </div>
  );
}

