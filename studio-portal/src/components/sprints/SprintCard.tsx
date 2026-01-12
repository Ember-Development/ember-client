"use client";

interface SprintCardProps {
  sprint: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    timeProgress?: number;
    itemsProgress?: number;
    totalDeliverables?: number;
    completedDeliverables?: number;
  };
  onEdit: () => void;
  onDelete: () => void;
}

export function SprintCard({ sprint, onEdit, onDelete }: SprintCardProps) {
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const timeProgress = sprint.timeProgress ?? 0;
  const itemsProgress = sprint.itemsProgress ?? 0;
  const totalDeliverables = sprint.totalDeliverables ?? 0;
  const completedDeliverables = sprint.completedDeliverables ?? 0;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{sprint.name}</h3>
          <p className="text-sm text-slate-600 mt-1">
            {formatDate(startDate)} - {formatDate(endDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit sprint"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete sprint"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Time Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600">Time Progress</span>
            <span className="font-medium text-slate-900">{timeProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${timeProgress}%` }}
            />
          </div>
        </div>

        {/* Items Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600">Items Progress</span>
            <span className="font-medium text-slate-900">
              {completedDeliverables} / {totalDeliverables} ({itemsProgress}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${itemsProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

