"use client";

import { useState, useEffect } from "react";
import { SprintCard } from "./SprintCard";
import { SprintEditor } from "./SprintEditor";
import { ActiveSprintDisplay } from "./ActiveSprintDisplay";

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  timeProgress?: number;
  itemsProgress?: number;
  totalDeliverables?: number;
  completedDeliverables?: number;
}

interface SprintManagementProps {
  projectId: string;
}

export function SprintManagement({ projectId }: SprintManagementProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<any>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSprints = async () => {
    try {
      const [sprintsRes, activeRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/sprints`),
        fetch(`/api/projects/${projectId}/sprints/active`),
      ]);
      const sprintsData = await sprintsRes.json();
      const activeData = await activeRes.json();
      setSprints(sprintsData);
      setActiveSprint(activeData.sprint);
    } catch (error) {
      console.error("Failed to fetch sprints:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSprints();
  }, [projectId]);

  const handleCreate = () => {
    setEditingSprint(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setIsEditorOpen(true);
  };

  const handleSave = async (data: { name: string; startDate: string }) => {
    try {
      if (editingSprint) {
        // Update
        await fetch(`/api/projects/${projectId}/sprints/${editingSprint.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        // Create
        await fetch(`/api/projects/${projectId}/sprints`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      setIsEditorOpen(false);
      setEditingSprint(null);
      fetchSprints();
    } catch (error) {
      console.error("Failed to save sprint:", error);
      alert("Failed to save sprint");
    }
  };

  const handleDelete = async () => {
    if (!editingSprint) return;
    if (!confirm(`Are you sure you want to delete "${editingSprint.name}"?`)) return;

    try {
      await fetch(`/api/projects/${projectId}/sprints/${editingSprint.id}`, {
        method: "DELETE",
      });
      setIsEditorOpen(false);
      setEditingSprint(null);
      fetchSprints();
    } catch (error) {
      console.error("Failed to delete sprint:", error);
      alert("Failed to delete sprint");
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading sprints...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Active Sprint */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Active Sprint</h3>
        <ActiveSprintDisplay sprint={activeSprint} />
      </div>

      {/* Sprint Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">All Sprints</h3>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Create Sprint
          </button>
        </div>

        {sprints.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
            No sprints yet. Create your first sprint to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                onEdit={() => handleEdit(sprint)}
                onDelete={() => {
                  setEditingSprint(sprint);
                  handleDelete();
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sprint Editor Modal */}
      {isEditorOpen && (
        <SprintEditor
          sprint={editingSprint}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingSprint(null);
          }}
          onSave={handleSave}
          onDelete={editingSprint ? handleDelete : undefined}
        />
      )}
    </div>
  );
}

