"use client";

import { useState } from "react";
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

interface DeliverablesListViewProps {
  projectId: string;
  deliverables: Deliverable[];
  projectMembers: ProjectMember[];
  sprints: Array<{ id: string; name: string; startDate: string; endDate: string }>;
  onUpdate: (id: string, updates: Partial<Deliverable>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "BACKLOG":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "PLANNED":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "QA":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "BLOCKED":
      return "bg-red-100 text-red-700 border-red-200";
    case "DONE":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "URGENT":
      return "text-red-600";
    case "HIGH":
      return "text-orange-600";
    case "MED":
      return "text-amber-600";
    case "LOW":
      return "text-slate-600";
    default:
      return "text-slate-500";
  }
};

export function DeliverablesListView({
  projectId,
  deliverables,
  projectMembers,
  sprints,
  onUpdate,
  onDelete,
}: DeliverablesListViewProps) {
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"status" | "priority" | "dueDate" | "title">("status");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const handleEdit = (deliverable: Deliverable) => {
    setSelectedDeliverable(deliverable);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Partial<Deliverable>) => {
    if (selectedDeliverable) {
      await onUpdate(selectedDeliverable.id, data);
    }
    setIsModalOpen(false);
    setSelectedDeliverable(null);
  };

  const handleDelete = async () => {
    if (selectedDeliverable) {
      await onDelete(selectedDeliverable.id);
      setIsModalOpen(false);
      setSelectedDeliverable(null);
    }
  };

  // Filter and sort deliverables
  let filteredDeliverables = deliverables;
  if (filterStatus) {
    filteredDeliverables = filteredDeliverables.filter((d) => d.status === filterStatus);
  }

  const sortedDeliverables = [...filteredDeliverables].sort((a, b) => {
    switch (sortBy) {
      case "status":
        return a.status.localeCompare(b.status);
      case "priority":
        const priorityOrder = { URGENT: 0, HIGH: 1, MED: 2, LOW: 3 };
        return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
      case "dueDate":
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case "title":
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  return (
    <>
      {/* Filters and Sort */}
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Filter:</label>
          <select
            value={filterStatus || ""}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="BACKLOG">Backlog</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="QA">QA</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="dueDate">Due Date</option>
            <option value="title">Title</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-slate-500">
          {sortedDeliverables.length} {sortedDeliverables.length === 1 ? "item" : "items"}
        </div>
      </div>

      {/* List Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Assignee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Sprint
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Estimate
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Due Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedDeliverables.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                    No deliverables found
                  </td>
                </tr>
              ) : (
                sortedDeliverables.map((deliverable) => (
                  <tr
                    key={deliverable.id}
                    onClick={() => handleEdit(deliverable)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {deliverable.status === "DONE" ? (
                            <span className="line-through">{deliverable.title}</span>
                          ) : (
                            deliverable.title
                          )}
                        </span>
                        {deliverable.description && (
                          <span className="text-xs text-slate-500 mt-1 line-clamp-1">
                            {deliverable.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(
                          deliverable.status
                        )}`}
                      >
                        {deliverable.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${getPriorityColor(deliverable.priority)}`}>
                        {deliverable.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {deliverable.assignee ? (
                        <span className="text-sm text-slate-700">
                          {deliverable.assignee.firstName} {deliverable.assignee.lastName}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {deliverable.sprint ? (
                        <span className="text-sm text-slate-700">{deliverable.sprint.name}</span>
                      ) : (
                        <span className="text-sm text-slate-400">No sprint</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {deliverable.estimateDays !== null ? (
                        <span className="text-sm text-slate-700">{deliverable.estimateDays} days</span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {deliverable.dueDate ? (
                        <span className="text-sm text-slate-700">
                          {new Date(deliverable.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedDeliverable && (
        <DeliverableModal
          deliverable={selectedDeliverable}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDeliverable(null);
          }}
          onSave={handleSave}
          onDelete={handleDelete}
          projectMembers={projectMembers}
          sprints={sprints}
          projectId={projectId}
        />
      )}
    </>
  );
}

