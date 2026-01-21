"use client";

import { useState } from "react";
import { KanbanBoard } from "./KanbanBoard";
import { DeliverablesListView } from "./DeliverablesListView";
import { ViewToggle } from "./ViewToggle";
import { SprintSelector } from "@/components/sprints/SprintSelector";
import { EpicSelector } from "@/components/epics/EpicSelector";

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
  epicId: string | null;
  epic: {
    id: string;
    title: string;
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
  epics?: Array<{ id: string; title: string; status: string }>;
  defaultView?: "kanban" | "list";
}

export function DeliverablesView({
  projectId,
  initialDeliverables,
  projectMembers,
  sprints,
  epics = [],
  defaultView = "kanban",
}: DeliverablesViewProps) {
  const [view, setView] = useState<"kanban" | "list">(defaultView);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);

  // Filter deliverables by sprint and/or epic
  const filteredDeliverables = initialDeliverables.filter((d) => {
    if (selectedSprintId && d.sprintId !== selectedSprintId) return false;
    if (selectedEpicId && d.epicId !== selectedEpicId) return false;
    return true;
  });

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
            {(selectedSprintId || selectedEpicId) && (
              <span className="ml-2 text-slate-500">
                (filtered)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sprint Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 whitespace-nowrap">Sprint:</label>
            <SprintSelector
              sprints={sprints}
              selectedSprintId={selectedSprintId}
              onChange={setSelectedSprintId}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          {/* Epic Filter */}
          {epics.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 whitespace-nowrap">Epic:</label>
              <EpicSelector
                epics={epics}
                selectedEpicId={selectedEpicId}
                onChange={setSelectedEpicId}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          )}
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
          epics={epics}
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

