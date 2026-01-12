"use client";

import { useState } from "react";
import { ChangeRequestType, ChangeRequestStatus, ChangeRequestScope, Priority } from ".prisma/client";

interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  type: ChangeRequestType;
  status: ChangeRequestStatus;
  scope: ChangeRequestScope;
  priority: Priority;
  aiEstimatedHours: number | null;
  estimateHours: number | null;
  estimateCostCents: number | null;
  estimatedTimelineDelayDays: number | null;
  newProjectDueDate: string | null;
  impactNotes: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface ChangeRequestReviewProps {
  projectId: string;
  changeRequests: ChangeRequest[];
  onUpdate?: () => void;
}

const statusOptions: ChangeRequestStatus[] = [
  "NEW",
  "NEEDS_CLARIFICATION",
  "REVIEWING",
  "APPROVED",
  "DECLINED",
  "SCHEDULED",
  "IN_PROGRESS",
  "SHIPPED",
  "CANCELED",
];

const scopeOptions: ChangeRequestScope[] = ["IN_SCOPE", "OUT_OF_SCOPE", "UNKNOWN"];

const priorityOptions: Priority[] = ["LOW", "MED", "HIGH", "URGENT"];

export function ChangeRequestReview({
  projectId,
  changeRequests,
  onUpdate,
}: ChangeRequestReviewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpdate = async (
    changeRequestId: string,
    updates: {
      estimateHours?: number | null;
      estimateCostCents?: number | null;
      status?: ChangeRequestStatus;
      scope?: ChangeRequestScope;
      priority?: Priority;
      impactNotes?: string | null;
    }
  ) => {
    setLoading(changeRequestId);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-requests/${changeRequestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update change request");
      }

      setEditingId(null);
      onUpdate?.();
      // Refresh the page to show updated data
      if (!onUpdate) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Update error:", error);
      alert(error instanceof Error ? error.message : "Failed to update change request");
    } finally {
      setLoading(null);
    }
  };

  const getStatusColor = (status: ChangeRequestStatus) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "DECLINED":
        return "bg-red-100 text-red-700 border-red-200";
      case "REVIEWING":
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "SHIPPED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "NEW":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (changeRequests.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        No change requests yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {changeRequests.map((cr) => {
        const isEditing = editingId === cr.id;
        const isLoading = loading === cr.id;

        return (
          <div
            key={cr.id}
            className="border border-slate-200 rounded-lg p-4 bg-white hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-slate-900">{cr.title}</h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(
                      cr.status
                    )}`}
                  >
                    {cr.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-2 line-clamp-2">{cr.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Type: {cr.type.replace("_", " ")}</span>
                  {cr.author && (
                    <span>
                      by{" "}
                      {cr.author.firstName && cr.author.lastName
                        ? `${cr.author.firstName} ${cr.author.lastName}`
                        : cr.author.email}
                    </span>
                  )}
                  <span>
                    {new Date(cr.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setEditingId(cr.id)}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                >
                  Review
                </button>
              )}
            </div>

            {/* Impact Information */}
            {(cr.aiEstimatedHours ||
              cr.estimateHours ||
              cr.estimatedTimelineDelayDays ||
              cr.estimateCostCents) && (
              <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">Impact Estimate</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {cr.aiEstimatedHours && (
                    <div>
                      <span className="text-slate-500">AI Estimate:</span>{" "}
                      <span className="font-semibold text-slate-900">{cr.aiEstimatedHours} hours</span>
                    </div>
                  )}
                  {cr.estimateHours && (
                    <div>
                      <span className="text-slate-500">Manual Estimate:</span>{" "}
                      <span className="font-semibold text-slate-900">{cr.estimateHours} hours</span>
                    </div>
                  )}
                  {cr.estimatedTimelineDelayDays && cr.estimatedTimelineDelayDays > 0 && (
                    <div>
                      <span className="text-slate-500">Timeline Delay:</span>{" "}
                      <span className="font-semibold text-slate-900">
                        {cr.estimatedTimelineDelayDays} day{cr.estimatedTimelineDelayDays !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  {cr.newProjectDueDate && (
                    <div>
                      <span className="text-slate-500">New Due Date:</span>{" "}
                      <span className="font-semibold text-slate-900">
                        {new Date(cr.newProjectDueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  {cr.estimateCostCents && (
                    <div className="col-span-2">
                      <span className="text-slate-500">Cost Estimate:</span>{" "}
                      <span className="font-semibold text-slate-900">
                        ${(cr.estimateCostCents / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Edit Form */}
            {isEditing && (
              <ChangeRequestEditForm
                changeRequest={cr}
                onSave={(updates) => handleUpdate(cr.id, updates)}
                onCancel={() => setEditingId(null)}
                isLoading={isLoading}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ChangeRequestEditFormProps {
  changeRequest: ChangeRequest;
  onSave: (updates: {
    estimateHours?: number | null;
    estimateCostCents?: number | null;
    status?: ChangeRequestStatus;
    scope?: ChangeRequestScope;
    priority?: Priority;
    impactNotes?: string | null;
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ChangeRequestEditForm({
  changeRequest,
  onSave,
  onCancel,
  isLoading,
}: ChangeRequestEditFormProps) {
  const [estimateHours, setEstimateHours] = useState<string>(
    changeRequest.estimateHours?.toString() || ""
  );
  const [estimateCostCents, setEstimateCostCents] = useState<string>(
    changeRequest.estimateCostCents ? (changeRequest.estimateCostCents / 100).toFixed(2) : ""
  );
  const [status, setStatus] = useState<ChangeRequestStatus>(changeRequest.status);
  const [scope, setScope] = useState<ChangeRequestScope>(changeRequest.scope);
  const [priority, setPriority] = useState<Priority>(changeRequest.priority);
  const [impactNotes, setImpactNotes] = useState<string>(changeRequest.impactNotes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      estimateHours: estimateHours ? parseFloat(estimateHours) : null,
      estimateCostCents: estimateCostCents ? Math.round(parseFloat(estimateCostCents) * 100) : null,
      status,
      scope,
      priority,
      impactNotes: impactNotes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-slate-200">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ChangeRequestStatus)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Scope
          </label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as ChangeRequestScope)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {scopeOptions.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {priorityOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Hours (override)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={estimateHours}
            onChange={(e) => setEstimateHours(e.target.value)}
            placeholder={changeRequest.aiEstimatedHours?.toString() || "Auto"}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Cost ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={estimateCostCents}
            onChange={(e) => setEstimateCostCents(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Impact Notes
        </label>
        <textarea
          value={impactNotes}
          onChange={(e) => setImpactNotes(e.target.value)}
          rows={3}
          placeholder="Additional notes about timeline or cost impact..."
          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-3 py-1.5 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
