"use client";

import { useState, useEffect } from "react";

interface Epic {
  id: string;
  title: string;
  description: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: "LOW" | "MED" | "HIGH" | "URGENT";
  assigneeId: string | null;
  dueDate: string | null;
  clientVisible: boolean;
}

interface ProjectMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface EpicEditorProps {
  epic: Epic | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string | null;
    status: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "CANCELLED";
    priority: "LOW" | "MED" | "HIGH" | "URGENT";
    assigneeId: string | null;
    dueDate: string | null;
    clientVisible: boolean;
  }) => void;
  onDelete?: () => void;
  projectMembers: ProjectMember[];
}

export function EpicEditor({
  epic,
  isOpen,
  onClose,
  onSave,
  onDelete,
  projectMembers,
}: EpicEditorProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Epic["status"]>("NOT_STARTED");
  const [priority, setPriority] = useState<Epic["priority"]>("MED");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [clientVisible, setClientVisible] = useState(true);

  useEffect(() => {
    if (epic) {
      setTitle(epic.title);
      setDescription(epic.description || "");
      setStatus(epic.status);
      setPriority(epic.priority);
      setAssigneeId(epic.assigneeId);
      setDueDate(epic.dueDate ? new Date(epic.dueDate).toISOString().split("T")[0] : "");
      setClientVisible(epic.clientVisible);
    } else {
      setTitle("");
      setDescription("");
      setStatus("NOT_STARTED");
      setPriority("MED");
      setAssigneeId(null);
      setDueDate("");
      setClientVisible(true);
    }
  }, [epic, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      assigneeId,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      clientVisible,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-slate-900">
            {epic ? "Edit Epic" : "Create Epic"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="e.g., User Authentication Epic"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                placeholder="Describe the epic and its goals..."
              />
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Epic["status"])}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Epic["priority"])}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="LOW">Low</option>
                  <option value="MED">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            {/* Assignee and Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assignee
                </label>
                <select
                  value={assigneeId || ""}
                  onChange={(e) => setAssigneeId(e.target.value || null)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="">Unassigned</option>
                  {projectMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName && member.lastName
                        ? `${member.firstName} ${member.lastName}`
                        : member.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>

            {/* Client Visible */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clientVisible}
                  onChange={(e) => setClientVisible(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Visible to client
                </span>
              </label>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-4 sticky bottom-0 bg-white">
          <div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              {epic ? "Save Changes" : "Create Epic"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

