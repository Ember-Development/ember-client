"use client";

import { useState, useEffect } from "react";
import { ChangeRequestType } from ".prisma/client";

interface ChangeRequestFormProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const changeRequestTypes: { value: ChangeRequestType; label: string }[] = [
  { value: "BUG", label: "Bug Fix" },
  { value: "ENHANCEMENT", label: "Enhancement" },
  { value: "NEW_FEATURE", label: "New Feature" },
  { value: "CONTENT", label: "Content Change" },
  { value: "OTHER", label: "Other" },
];

export function ChangeRequestForm({ projectId, onSuccess, onCancel }: ChangeRequestFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ChangeRequestType>("ENHANCEMENT");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{
    hours: number | null;
    delayDays: number | null;
    newDueDate: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isCheckingLimit, setIsCheckingLimit] = useState(true);
  const [weeklyLimitReached, setWeeklyLimitReached] = useState(false);
  const [nextAvailableDate, setNextAvailableDate] = useState<string | null>(null);

  // Check weekly limit on component mount
  useEffect(() => {
    const checkWeeklyLimit = async () => {
      try {
        // Fetch existing change requests to check if one was submitted this week
        const response = await fetch(`/api/projects/${projectId}/change-requests`);
        if (!response.ok) {
          setIsCheckingLimit(false);
          return;
        }

        const changeRequests = await response.json();
        
        // Calculate start of current week (Monday at 00:00:00)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - daysToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        // Check if there's a change request this week
        const requestsThisWeek = changeRequests.filter((cr: any) => {
          const createdAt = new Date(cr.createdAt);
          return createdAt >= startOfWeek;
        });

        if (requestsThisWeek.length >= 1) {
          setWeeklyLimitReached(true);
          // Calculate next Monday
          const nextMonday = new Date(startOfWeek);
          nextMonday.setDate(startOfWeek.getDate() + 7);
          setNextAvailableDate(nextMonday.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }));
        }
      } catch (err) {
        console.error("Error checking weekly limit:", err);
      } finally {
        setIsCheckingLimit(false);
      }
    };

    checkWeeklyLimit();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setIsRateLimited(false);

    try {
      const response = await fetch(`/api/projects/${projectId}/change-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const isRateLimit = response.status === 429;
        setIsRateLimited(isRateLimit);
        throw new Error(errorData.error || "Failed to submit change request");
      }

      const data = await response.json();
      
      // Show estimate if available
      if (data.aiEstimatedHours) {
        setEstimate({
          hours: data.aiEstimatedHours,
          delayDays: data.estimatedTimelineDelayDays,
          newDueDate: data.newProjectDueDate,
        });
      }

      // Reset form
      setTitle("");
      setDescription("");
      setType("ENHANCEMENT");
      
      // Mark weekly limit as reached after successful submission
      setWeeklyLimitReached(true);
      // Calculate next Monday
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      const nextMonday = new Date(startOfWeek);
      nextMonday.setDate(startOfWeek.getDate() + 7);
      setNextAvailableDate(nextMonday.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }));
      
      // Call success callback after a short delay to show estimate
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit change request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = weeklyLimitReached || isCheckingLimit;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Request a Change</h3>

      {isCheckingLimit && (
        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-sm text-slate-600">Checking submission limit...</p>
        </div>
      )}

      {weeklyLimitReached && !isCheckingLimit && (
        <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900 mb-1">Weekly Limit Reached</p>
              <p className="text-sm font-medium text-amber-800">
                You have already submitted a change request this week. {nextAvailableDate && `You can submit another one starting ${nextAvailableDate}.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {estimate && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900 mb-2">Impact Estimate</p>
              <div className="text-sm font-medium text-blue-800 space-y-1.5">
                {estimate.hours && (
                  <p>Estimated effort: <strong className="font-bold">{estimate.hours} hours</strong></p>
                )}
                {estimate.delayDays && estimate.delayDays > 0 && (
                  <p>Timeline impact: <strong className="font-bold">{estimate.delayDays} day{estimate.delayDays !== 1 ? "s" : ""} delay</strong></p>
                )}
                {estimate.newDueDate && (
                  <p>New projected due date: <strong className="font-bold">{new Date(estimate.newDueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong></p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2.5">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ChangeRequestType)}
            disabled={isFormDisabled}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"
            required
          >
            {changeRequestTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of the change"
            disabled={isFormDisabled}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2.5">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of what you'd like to change..."
            rows={6}
            disabled={isFormDisabled}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"
            required
          />
        </div>

        {error && (
          <div className={`p-4 rounded-lg text-sm font-medium ${
            isRateLimited 
              ? "bg-amber-50 border-2 border-amber-300 text-amber-900" 
              : "bg-red-50 border border-red-200 text-red-800"
          }`}>
            <div className="flex items-start gap-2">
              {isRateLimited && (
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <p className="flex-1">{error}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || isEstimating || isFormDisabled}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isSubmitting ? "Submitting..." : "Submit Change Request"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-slate-800 text-sm font-semibold rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
