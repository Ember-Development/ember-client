"use client";

import { useState } from "react";
import { KanbanBoard } from "./KanbanBoard";
import { DeliverablesListView } from "./DeliverablesListView";
import { ViewToggle } from "./ViewToggle";
import { SprintSelector } from "@/components/sprints/SprintSelector";

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
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  // Filter deliverables by sprint
  const filteredDeliverables = selectedSprintId
    ? initialDeliverables.filter((d) => d.sprintId === selectedSprintId)
    : initialDeliverables;

  return (
    <div>
      {/* View Toggle Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {view === "kanban" ? "Kanban Board" : "List View"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {filteredDeliverables.length} {filteredDeliverables.length === 1 ? "deliverable" : "deliverables"}
            {selectedSprintId && (
              <span className="ml-2 text-slate-500">
                (filtered by sprint)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sprint Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 whitespace-nowrap">Filter by Sprint:</label>
            <SprintSelector
              sprints={sprints}
              selectedSprintId={selectedSprintId}
              onChange={setSelectedSprintId}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      {/* View Content */}
      {view === "kanban" ? (
        <KanbanBoard
          projectId={projectId}
          initialDeliverables={filteredDeliverables}
          projectMembers={projectMembers}
          sprints={sprints}
        />
      ) : (
        <DeliverablesListView
          projectId={projectId}
          deliverables={filteredDeliverables}
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

