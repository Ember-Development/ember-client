"use client";

import { useState, useEffect } from "react";
import { MilestoneStatus } from ".prisma/client";
import { useRouter } from "next/navigation";

interface MilestoneEditorProps {
  projectId: string;
  milestone?: {
    id: string;
    title: string;
    description: string | null;
    status: MilestoneStatus;
    dueDate: string | null;
    requiresClientApproval: boolean;
    assignedToId: string | null;
    clientVisible: boolean;
    orderIndex: number;
  } | null;
  projectMembers: Array<{
    id: string;
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
  }>;
  onClose: () => void;
}

export function MilestoneEditor({
  projectId,
  milestone,
  projectMembers,
  onClose,
}: MilestoneEditorProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: milestone?.title || "",
    description: milestone?.description || "",
    status: milestone?.status || MilestoneStatus.NOT_STARTED,
    dueDate: milestone?.dueDate
      ? new Date(milestone.dueDate).toISOString().split("T")[0]
      : "",
    requiresClientApproval: milestone?.requiresClientApproval || false,
    assignedToId: milestone?.assignedToId || "",
    clientVisible: milestone?.clientVisible !== undefined ? milestone.clientVisible : true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = milestone
        ? `/api/projects/${projectId}/milestones/${milestone.id}`
        : `/api/projects/${projectId}/milestones`;
      const method = milestone ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dueDate: formData.dueDate || null,
          assignedToId: formData.assignedToId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save milestone");
      }

      router.refresh();
      onClose();
    } catch (error: any) {
      alert(`Failed to save milestone: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!milestone) return;
    if (!confirm("Are you sure you want to delete this milestone?")) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/milestones/${milestone.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete milestone");
      }

      router.refresh();
      onClose();
    } catch (error: any) {
      alert(`Failed to delete milestone: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              {milestone ? "Edit Milestone" : "Create Milestone"}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Milestone title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Milestone description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as MilestoneStatus })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={MilestoneStatus.NOT_STARTED}>Not Started</option>
                <option value={MilestoneStatus.IN_PROGRESS}>In Progress</option>
                <option value={MilestoneStatus.BLOCKED}>Blocked</option>
                <option value={MilestoneStatus.DONE}>Done</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Assign To</label>
            <select
              value={formData.assignedToId}
              onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Unassigned</option>
              {projectMembers.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.firstName && member.user.lastName
                    ? `${member.user.firstName} ${member.user.lastName}`
                    : member.user.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requiresClientApproval}
                onChange={(e) =>
                  setFormData({ ...formData, requiresClientApproval: e.target.checked })
                }
                className="rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">
                Requires Client Approval
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.clientVisible}
                onChange={(e) => setFormData({ ...formData, clientVisible: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">Client Visible</span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div>
              {milestone && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

