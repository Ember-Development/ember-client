"use client";

interface EpicCardProps {
  epic: {
    id: string;
    title: string;
    description: string | null;
    status: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "CANCELLED";
    priority: "LOW" | "MED" | "HIGH" | "URGENT";
    dueDate: string | null;
    assignee: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
    deliverableCount?: number;
  };
  onEdit: () => void;
  onDelete: () => void;
}

export function EpicCard({ epic, onEdit, onDelete }: EpicCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "NOT_STARTED":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "DONE":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "CANCELLED":
        return "bg-red-100 text-red-700 border-red-200";
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">{epic.title}</h3>
          {epic.description && (
            <p className="text-sm text-slate-600 line-clamp-2">{epic.description}</p>
          )}
        </div>
        <div className="flex gap-2 ml-3 shrink-0">
          <button
            onClick={onEdit}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit epic"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete epic"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Status and Priority */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${getStatusColor(epic.status)}`}>
            {epic.status.replace(/_/g, " ")}
          </span>
          <span className={`text-xs font-medium ${getPriorityColor(epic.priority)}`}>
            {epic.priority} Priority
          </span>
        </div>

        {/* Assignee */}
        {epic.assignee && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>
              {epic.assignee.firstName && epic.assignee.lastName
                ? `${epic.assignee.firstName} ${epic.assignee.lastName}`
                : epic.assignee.email}
            </span>
          </div>
        )}

        {/* Due Date */}
        {epic.dueDate && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Due: {formatDate(epic.dueDate)}</span>
          </div>
        )}

        {/* Deliverable Count */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>{epic.deliverableCount || 0} deliverable{epic.deliverableCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}

