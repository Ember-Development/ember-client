"use client";

import { useState, useEffect } from "react";

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface SprintEditorProps {
  sprint: Sprint | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; startDate: string }) => void;
  onDelete?: () => void;
}

export function SprintEditor({
  sprint,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: SprintEditorProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (sprint) {
      setName(sprint.name);
      // Format date for input (YYYY-MM-DD)
      const date = new Date(sprint.startDate);
      setStartDate(date.toISOString().split("T")[0]);
    } else {
      setName("");
      // Default to today
      setStartDate(new Date().toISOString().split("T")[0]);
    }
  }, [sprint, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate) return;

    // Convert startDate to ISO datetime string
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    
    onSave({
      name: name.trim(),
      startDate: startDateTime.toISOString(),
    });
  };

  const calculateEndDate = () => {
    if (!startDate) return "";
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);
    return end.toISOString().split("T")[0];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {sprint ? "Edit Sprint" : "Create Sprint"}
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sprint Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="e.g., Sprint 1, Q1 Sprint 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Date (Auto-calculated)
              </label>
              <input
                type="date"
                value={calculateEndDate()}
                disabled
                className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-slate-500">
                Sprints are 2 weeks (14 days) long
              </p>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-4">
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
              {sprint ? "Save Changes" : "Create Sprint"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

