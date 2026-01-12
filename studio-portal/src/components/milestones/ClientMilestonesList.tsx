"use client";

import { MilestoneStatus, ApprovalStatus } from ".prisma/client";
import { MilestoneProgress } from "./MilestoneProgress";
import { ClientApproval } from "./ClientApproval";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  dueDate: string | null;
  requiresClientApproval: boolean;
  approvalStatus: ApprovalStatus | null;
  approvalNotes: string | null;
  progress: number | null;
  deliverablesCount: number;
  completedDeliverablesCount: number;
}

interface ClientMilestonesListProps {
  milestones: Milestone[];
  projectId: string;
}

export function ClientMilestonesList({ milestones, projectId }: ClientMilestonesListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "DONE":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "BLOCKED":
        return "bg-red-100 text-red-700 border-red-200";
      case "NOT_STARTED":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="mt-3 grid grid-cols-1 gap-4">
      {milestones.length === 0 ? (
        <p className="text-sm text-slate-600">No milestones posted yet.</p>
      ) : (
        milestones.map((m) => (
          <div key={m.id} className="rounded-lg border border-slate-200 p-4 bg-white">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{m.title}</h3>
                {m.description && (
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">{m.description}</p>
                )}
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border shrink-0 ${getStatusColor(
                  m.status
                )}`}
              >
                {m.status.replace("_", " ")}
              </span>
            </div>

            {m.progress !== null && (
              <div className="mb-3">
                <MilestoneProgress
                  progress={m.progress}
                  total={m.deliverablesCount}
                  completed={m.completedDeliverablesCount}
                  milestoneId={m.id}
                  projectId={projectId}
                />
              </div>
            )}

            {m.requiresClientApproval && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <ClientApproval
                  milestoneId={m.id}
                  projectId={projectId}
                  requiresClientApproval={m.requiresClientApproval}
                  approvalStatus={m.approvalStatus}
                  approvalNotes={m.approvalNotes}
                  isClient={true}
                />
              </div>
            )}

            {m.dueDate && (
              <p className="mt-2 text-xs text-slate-500">
                Due: {new Date(m.dueDate).toLocaleDateString()}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

