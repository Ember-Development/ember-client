"use client";

import { ApprovalStatus } from ".prisma/client";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

interface ClientApprovalProps {
  milestoneId: string;
  projectId: string;
  requiresClientApproval: boolean;
  approvalStatus: ApprovalStatus | null;
  approvalNotes: string | null;
  isClient: boolean;
}

export function ClientApproval({
  milestoneId,
  projectId,
  requiresClientApproval,
  approvalStatus,
  approvalNotes,
  isClient,
}: ClientApprovalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");

  if (!requiresClientApproval) {
    return null;
  }

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/milestones/${milestoneId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve milestone");
      }

      window.location.reload();
    } catch (error: any) {
      alert(`Failed to approve: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changeNotes.trim()) {
      alert("Please provide notes explaining what changes are needed.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/milestones/${milestoneId}/request-changes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: changeNotes }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to request changes");
      }

      window.location.reload();
    } catch (error: any) {
      alert(`Failed to request changes: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setShowRequestChanges(false);
      setChangeNotes("");
    }
  };

  const getStatusDisplay = () => {
    switch (approvalStatus) {
      case "APPROVED":
        return {
          icon: <CheckCircleIcon className="h-5 w-5 text-emerald-600" />,
          text: "Approved",
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
        };
      case "CHANGES_REQUESTED":
        return {
          icon: <XCircleIcon className="h-5 w-5 text-amber-600" />,
          text: "Changes Requested",
          color: "text-amber-700 bg-amber-50 border-amber-200",
        };
      case "PENDING":
      default:
        return {
          icon: <ClockIcon className="h-5 w-5 text-slate-600" />,
          text: "Pending Approval",
          color: "text-slate-700 bg-slate-50 border-slate-200",
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {statusDisplay.icon}
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${statusDisplay.color}`}
        >
          {statusDisplay.text}
        </span>
      </div>

      {approvalNotes && (
        <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="font-medium mb-1">Notes:</p>
          <p className="whitespace-pre-wrap">{approvalNotes}</p>
        </div>
      )}

      {isClient && approvalStatus !== "APPROVED" && (
        <div className="flex items-center gap-2">
          {!showRequestChanges ? (
            <>
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Approving..." : "Approve"}
              </button>
              <button
                onClick={() => setShowRequestChanges(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Request Changes
              </button>
            </>
          ) : (
            <div className="flex-1 space-y-2">
              <textarea
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="What changes are needed?"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRequestChanges}
                  disabled={isSubmitting || !changeNotes.trim()}
                  className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  onClick={() => {
                    setShowRequestChanges(false);
                    setChangeNotes("");
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

