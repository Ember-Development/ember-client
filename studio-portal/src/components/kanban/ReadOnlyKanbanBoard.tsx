"use client";

import { KanbanColumn } from "./KanbanColumn";
import { DeliverableModal } from "./DeliverableModal";
import { useState } from "react";

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

interface ReadOnlyKanbanBoardProps {
  projectId: string;
  deliverables: Deliverable[];
  sprints?: Array<{ id: string; name: string; startDate: string; endDate: string }>;
}

export function ReadOnlyKanbanBoard({ projectId, deliverables, sprints = [] }: ReadOnlyKanbanBoardProps) {
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const columns = [
    { id: "BACKLOG", title: "Backlog", color: "gray" },
    { id: "PLANNED", title: "Planned", color: "slate" },
    { id: "IN_PROGRESS", title: "In Progress", color: "blue" },
    { id: "QA", title: "QA", color: "purple" },
    { id: "BLOCKED", title: "Blocked", color: "red" },
    { id: "DONE", title: "Done", color: "emerald" },
  ] as const;

  const handleCardClick = (deliverable: Deliverable) => {
    setSelectedDeliverable(deliverable);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDeliverable(null);
  };

  // Group deliverables by status
  const deliverablesByStatus = deliverables.reduce(
    (acc, deliverable) => {
      if (!acc[deliverable.status]) {
        acc[deliverable.status] = [];
      }
      acc[deliverable.status].push(deliverable);
      return acc;
    },
    {} as Record<string, Deliverable[]>
  );

  // Sort deliverables by orderIndex within each status
  Object.keys(deliverablesByStatus).forEach((status) => {
    deliverablesByStatus[status].sort((a, b) => a.orderIndex - b.orderIndex);
  });

  return (
    <div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnDeliverables = deliverablesByStatus[column.id] || [];
          return (
            <div key={column.id} className="shrink-0 w-80">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">{column.title}</h3>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-white text-slate-600 border border-slate-200">
                      {columnDeliverables.length}
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px] max-h-[600px]">
                  {columnDeliverables.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400">
                      No items
                    </div>
                  ) : (
                    columnDeliverables.map((deliverable) => (
                      <div
                        key={deliverable.id}
                        onClick={() => handleCardClick(deliverable)}
                        className="bg-white rounded-lg border border-slate-200 p-3 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <h4 className="text-sm font-semibold text-slate-900 mb-2 line-clamp-2">
                          {deliverable.title}
                        </h4>
                        {deliverable.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                            {deliverable.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          {deliverable.assignee && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-700">
                                  {(deliverable.assignee.firstName || deliverable.assignee.lastName)
                                    ? `${deliverable.assignee.firstName?.[0] || ""}${deliverable.assignee.lastName?.[0] || ""}`.toUpperCase()
                                    : deliverable.assignee.email[0].toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs text-slate-600">
                                {deliverable.assignee.firstName && deliverable.assignee.lastName
                                  ? `${deliverable.assignee.firstName} ${deliverable.assignee.lastName}`
                                  : deliverable.assignee.email}
                              </span>
                            </div>
                          )}
                          {deliverable.estimateDays && (
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {deliverable.estimateDays}d
                            </span>
                          )}
                          {deliverable.sprint && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {deliverable.sprint.name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && selectedDeliverable && (
        <DeliverableModal
          deliverable={selectedDeliverable}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={async () => {
            // Read-only, no save functionality
          }}
          onDelete={undefined}
          projectMembers={[]}
          sprints={sprints}
          projectId={projectId}
          isReadOnly={true}
        />
      )}
    </div>
  );
}

