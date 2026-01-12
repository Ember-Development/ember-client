"use client";

import { ChangeRequestForm } from "./ChangeRequestForm";
import { useState, useEffect } from "react";

interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  aiEstimatedHours: number | null;
  estimatedTimelineDelayDays: number | null;
  estimateCostCents: number | null;
  createdAt: string;
}

interface ChangeRequestSectionProps {
  projectId: string;
}

const typeLabels: Record<string, string> = {
  BUG: "Bug Fix",
  ENHANCEMENT: "Enhancement",
  NEW_FEATURE: "New Feature",
  CONTENT: "Content Update",
  OTHER: "Other",
};

export function ChangeRequestSection({ projectId }: ChangeRequestSectionProps) {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChangeRequests = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/change-requests`);
      if (response.ok) {
        const data = await response.json();
        setChangeRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch change requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChangeRequests();
  }, [projectId]);

  const handleSuccess = () => {
    fetchChangeRequests();
  };

  return (
    <>
      {/* Change Requests Section */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Request Changes</h2>
              <p className="mt-1 text-sm text-slate-500">
                Submit change requests and see automatic timeline impact estimates
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <ChangeRequestForm projectId={projectId} onSuccess={handleSuccess} />
        </div>
      </section>

      {/* My Change Requests */}
      {!loading && changeRequests.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">My Change Requests</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {changeRequests.map((cr) => (
              <div key={cr.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">{cr.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{cr.description}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border shrink-0 ${
                      cr.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : cr.status === "DECLINED"
                        ? "bg-red-100 text-red-700 border-red-200"
                        : cr.status === "REVIEWING"
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {cr.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600 mt-2">
                  <span>{typeLabels[cr.type]}</span>
                  {cr.aiEstimatedHours && (
                    <span>
                      AI Estimate: <strong>{cr.aiEstimatedHours}</strong> hours
                    </span>
                  )}
                  {cr.estimatedTimelineDelayDays && cr.estimatedTimelineDelayDays > 0 && (
                    <span>
                      Delay: <strong>{cr.estimatedTimelineDelayDays}</strong> days
                    </span>
                  )}
                  {cr.estimateCostCents && (
                    <span>
                      Cost: <strong>${(cr.estimateCostCents / 100).toFixed(2)}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

