"use client";

import { useState } from "react";
import { MilestoneStatus, ApprovalStatus } from ".prisma/client";
import { MilestoneEditor } from "./MilestoneEditor";
import { MilestoneProgress } from "./MilestoneProgress";
import { ClientApproval } from "./ClientApproval";
import { useRouter } from "next/navigation";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  dueDate: string | null;
  requiresClientApproval: boolean;
  approvalStatus: ApprovalStatus | null;
  approvalNotes: string | null;
  assignedToId: string | null;
  assignedTo: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  clientVisible: boolean;
  progress: number | null;
  deliverablesCount: number;
  completedDeliverablesCount: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface ProjectMember {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface MilestonesPageClientProps {
  projectId: string;
  projectName: string;
  milestones: Milestone[];
  projectMembers: ProjectMember[];
}

export function MilestonesPageClient({
  projectId,
  projectName,
  milestones: initialMilestones,
  projectMembers,
}: MilestonesPageClientProps) {
  const router = useRouter();
  const [milestones, setMilestones] = useState(initialMilestones);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const getApprovalStatusColor = (status: ApprovalStatus | null) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "CHANGES_REQUESTED":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "PENDING":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return null;
    }
  };

  const filteredMilestones =
    statusFilter === "all"
      ? milestones
      : milestones.filter((m) => m.status === statusFilter);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <a
            href={`/internal/projects/${projectId}`}
            className="text-sm text-slate-600 hover:text-slate-900 mb-2 inline-block"
          >
            ← Back to Project
          </a>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Milestones - {projectName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {milestones.length} {milestones.length === 1 ? "milestone" : "milestones"}
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          + Create Milestone
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Filter:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="BLOCKED">Blocked</option>
          <option value="DONE">Done</option>
        </select>
      </div>

      {/* Milestones List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredMilestones.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              {statusFilter === "all"
                ? "No milestones yet. Create one to get started."
                : `No milestones with status "${statusFilter}".`}
            </div>
          ) : (
            filteredMilestones.map((milestone) => (
              <div key={milestone.id} className="px-6 py-5 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-slate-900">{milestone.title}</h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border shrink-0 ${getStatusColor(
                          milestone.status
                        )}`}
                      >
                        {milestone.status.replace("_", " ")}
                      </span>
                      {milestone.requiresClientApproval && (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border shrink-0 ${
                            getApprovalStatusColor(milestone.approvalStatus) || ""
                          }`}
                        >
                          {milestone.approvalStatus === "PENDING"
                            ? "Pending Approval"
                            : milestone.approvalStatus === "APPROVED"
                            ? "Approved"
                            : milestone.approvalStatus === "CHANGES_REQUESTED"
                            ? "Changes Requested"
                            : "Needs Approval"}
                        </span>
                      )}
                    </div>

                    {milestone.description && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {milestone.description}
                      </p>
                    )}

                    {/* Progress */}
                    {milestone.deliverablesCount > 0 && (
                      <div className="mb-3">
                        <MilestoneProgress
                          progress={milestone.progress}
                          total={milestone.deliverablesCount}
                          completed={milestone.completedDeliverablesCount}
                          milestoneId={milestone.id}
                          projectId={projectId}
                        />
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {milestone.dueDate && (
                        <span>
                          Due: {new Date(milestone.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {milestone.assignedTo && (
                        <span>
                          Assigned to:{" "}
                          {milestone.assignedTo.firstName && milestone.assignedTo.lastName
                            ? `${milestone.assignedTo.firstName} ${milestone.assignedTo.lastName}`
                            : milestone.assignedTo.email}
                        </span>
                      )}
                      {milestone.clientVisible && (
                        <span className="text-emerald-600">Client-visible</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingMilestone(milestone)}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor Modals */}
      {isCreating && (
        <MilestoneEditor
          projectId={projectId}
          milestone={null}
          projectMembers={projectMembers}
          onClose={() => {
            setIsCreating(false);
            handleRefresh();
          }}
        />
      )}

      {editingMilestone && (
        <MilestoneEditor
          projectId={projectId}
          milestone={editingMilestone}
          projectMembers={projectMembers}
          onClose={() => {
            setEditingMilestone(null);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}

