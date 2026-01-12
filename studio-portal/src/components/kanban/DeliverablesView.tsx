"use client";

import { useState } from "react";
import { KanbanBoard } from "./KanbanBoard";
import { DeliverablesListView } from "./DeliverablesListView";
import { ViewToggle } from "./ViewToggle";

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

interface DeliverablesViewProps {
  projectId: string;
  initialDeliverables: Deliverable[];
  projectMembers: ProjectMember[];
  sprints: Array<{ id: string; name: string; startDate: string; endDate: string }>;
  defaultView?: "kanban" | "list";
}

export function DeliverablesView({
  projectId,
  initialDeliverables,
  projectMembers,
  sprints,
  defaultView = "kanban",
}: DeliverablesViewProps) {
  const [view, setView] = useState<"kanban" | "list">(defaultView);

  return (
    <div>
      {/* View Toggle Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {view === "kanban" ? "Kanban Board" : "List View"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {initialDeliverables.length} {initialDeliverables.length === 1 ? "deliverable" : "deliverables"}
          </p>
        </div>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {/* View Content */}
      {view === "kanban" ? (
        <KanbanBoard
          projectId={projectId}
          initialDeliverables={initialDeliverables}
          projectMembers={projectMembers}
          sprints={sprints}
        />
      ) : (
        <DeliverablesListView
          projectId={projectId}
          deliverables={initialDeliverables}
          projectMembers={projectMembers}
          sprints={sprints}
          onUpdate={async (id, updates) => {
            const response = await fetch(`/api/projects/${projectId}/deliverables/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...updates,
                dueDate: updates.dueDate ? (updates.dueDate instanceof Date ? updates.dueDate.toISOString() : updates.dueDate) : null,
              }),
            });
            if (!response.ok) {
              throw new Error("Failed to update deliverable");
            }
          }}
          onDelete={async (id) => {
            const response = await fetch(`/api/projects/${projectId}/deliverables/${id}`, {
              method: "DELETE",
            });
            if (!response.ok) {
              throw new Error("Failed to delete deliverable");
            }
          }}
        />
      )}
    </div>
  );
}

