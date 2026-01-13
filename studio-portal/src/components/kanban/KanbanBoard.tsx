"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KanbanColumn } from "./KanbanColumn";
import { DeliverableModal } from "./DeliverableModal";

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  status: "BACKLOG" | "PLANNED" | "IN_PROGRESS" | "QA" | "BLOCKED" | "DONE";
  priority: "LOW" | "MED" | "HIGH" | "URGENT";
  dueDate: Date | null;
  assigneeId: string | null;
  assignee: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  estimateDays: number | null;
  sprintId: string | null;
  sprint: {
    id: string;
    name: string;
  } | null;
  orderIndex: number;
}

interface ProjectMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface KanbanBoardProps {
  projectId: string;
  initialDeliverables: Deliverable[];
  projectMembers: ProjectMember[];
  sprints?: Array<{ id: string; name: string; startDate: string; endDate: string }>;
}

export function KanbanBoard({ projectId, initialDeliverables, projectMembers, sprints: initialSprints = [] }: KanbanBoardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null);
  const [sprints, setSprints] = useState<Array<{ id: string; name: string; startDate: string; endDate: string }>>(initialSprints);

  // Fetch sprints on mount if not provided
  useEffect(() => {
    if (initialSprints.length === 0) {
      fetch(`/api/projects/${projectId}/sprints`)
        .then((res) => res.json())
        .then((data) => setSprints(data))
        .catch((err) => console.error("Failed to fetch sprints:", err));
    }
  }, [projectId, initialSprints]);

  // Check for query parameters to open modal
  useEffect(() => {
    const deliverableId = searchParams.get("deliverableId");
    const commentId = searchParams.get("highlightComment");
    
    if (deliverableId) {
      const deliverable = deliverables.find((d) => d.id === deliverableId);
      if (deliverable) {
        setSelectedDeliverable(deliverable);
        setIsModalOpen(true);
        if (commentId) {
          setHighlightCommentId(commentId);
        }
        // Clean up URL
        const url = new URL(window.location.href);
        url.searchParams.delete("deliverableId");
        url.searchParams.delete("highlightComment");
        router.replace(url.pathname + url.search, { scroll: false });
      }
    }
  }, [searchParams, deliverables, router]);

  const columns = [
    { id: "BACKLOG", title: "Backlog", color: "gray" },
    { id: "PLANNED", title: "Planned", color: "slate" },
    { id: "IN_PROGRESS", title: "In Progress", color: "blue" },
    { id: "QA", title: "QA", color: "purple" },
    { id: "BLOCKED", title: "Blocked", color: "red" },
    { id: "DONE", title: "Done", color: "emerald" },
  ] as const;

  const handleMove = async (deliverableId: string, newStatus: string, newOrderIndex: number) => {
    // Optimistically update the UI
    const previousState = [...deliverables];
    const updated = deliverables.map((d) => {
      if (d.id === deliverableId) {
        return { ...d, status: newStatus as Deliverable["status"], orderIndex: newOrderIndex };
      }
      return d;
    });

    setDeliverables(updated);

    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/${deliverableId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, orderIndex: newOrderIndex }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to move deliverable");
      }

      // Refresh the page data to ensure consistency
      const movedDeliverable = await response.json();
      setDeliverables(updated.map((d) => 
        d.id === deliverableId 
          ? { ...d, status: movedDeliverable.status, orderIndex: movedDeliverable.orderIndex }
          : d
      ));
    } catch (error) {
      console.error("Failed to move deliverable:", error);
      // Revert to previous state on error
      setDeliverables(previousState);
      alert(`Failed to move deliverable: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleDelete = async (deliverableId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/deliverables/${deliverableId}`, {
        method: "DELETE",
      });
      setDeliverables(deliverables.filter((d) => d.id !== deliverableId));
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to delete deliverable:", error);
    }
  };

  const handleSave = async (data: Partial<Deliverable>) => {
    try {
      if (selectedDeliverable) {
        // Update
        const response = await fetch(`/api/projects/${projectId}/deliverables/${selectedDeliverable.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            dueDate: data.dueDate ? (data.dueDate instanceof Date ? data.dueDate.toISOString() : data.dueDate) : null,
          }),
        });
        const updated = await response.json();
        setDeliverables(deliverables.map((d) => 
          d.id === updated.id 
            ? { 
                ...updated, 
                dueDate: updated.dueDate ? new Date(updated.dueDate) : null,
                assignee: updated.assignee,
              } 
            : d
        ));
      } else {
        // Create
        const response = await fetch(`/api/projects/${projectId}/deliverables`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            dueDate: data.dueDate ? (data.dueDate instanceof Date ? data.dueDate.toISOString() : data.dueDate) : null,
          }),
        });
        const created = await response.json();
        setDeliverables([...deliverables, { 
          ...created, 
          dueDate: created.dueDate ? new Date(created.dueDate) : null,
          assignee: created.assignee,
          sprint: created.sprint,
        }]);
      }
      setIsModalOpen(false);
      setSelectedDeliverable(null);
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to save deliverable:", error);
    }
  };

  const handleCreate = () => {
    setSelectedDeliverable(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleEdit = (deliverable: Deliverable) => {
    setSelectedDeliverable(deliverable);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleCreateInColumn = async (title: string, status: string) => {
    if (!title.trim()) return;

    try {
      // Create deliverable with minimal data
      const response = await fetch(`/api/projects/${projectId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          status: status,
          priority: "MED",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create deliverable");
      }

      const created = await response.json();
      const newDeliverable = { 
        ...created, 
        dueDate: created.dueDate ? new Date(created.dueDate) : null,
        assignee: null,
        estimateDays: null,
      };
      setDeliverables([...deliverables, newDeliverable]);
      
      // Don't auto-open modal - user can edit inline or click to open modal
    } catch (error) {
      console.error("Failed to create deliverable:", error);
      alert("Failed to create deliverable. Please try again.");
    }
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {columns.map((column) => {
          const columnItems = deliverables.filter((d) => d.status === column.id);
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              items={columnItems}
              onMove={handleMove}
              onEdit={handleEdit}
              onCreate={(title) => handleCreateInColumn(title, column.id)}
              onUpdate={async (id, updates) => {
                try {
                  const response = await fetch(`/api/projects/${projectId}/deliverables/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates),
                  });
                  if (response.ok) {
                    const updated = await response.json();
                    setDeliverables(deliverables.map((d) => 
                      d.id === id 
                        ? { 
                            ...d, 
                            ...updated, 
                            dueDate: updated.dueDate ? new Date(updated.dueDate) : null,
                            assignee: updated.assignee || d.assignee,
                            sprint: updated.sprint || d.sprint,
                          }
                        : d
                    ));
                  }
                } catch (error) {
                  console.error("Failed to update deliverable:", error);
                }
              }}
              projectMembers={projectMembers}
              sprints={sprints}
            />
          );
        })}
      </div>

      {isModalOpen && (
        <DeliverableModal
          deliverable={selectedDeliverable}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDeliverable(null);
            setIsCreating(false);
            setHighlightCommentId(null);
          }}
          onSave={handleSave}
          onDelete={selectedDeliverable ? () => handleDelete(selectedDeliverable.id) : undefined}
          projectMembers={projectMembers}
          sprints={sprints}
          projectId={projectId}
          highlightCommentId={highlightCommentId}
        />
      )}
    </>
  );
}

