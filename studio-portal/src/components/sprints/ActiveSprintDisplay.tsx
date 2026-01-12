"use client";

interface ActiveSprintDisplayProps {
  sprint: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    timeProgress: number;
    itemsProgress: number;
    totalDeliverables: number;
    completedDeliverables: number;
    daysRemaining: number;
  } | null;
}

export function ActiveSprintDisplay({ sprint }: ActiveSprintDisplayProps) {
  if (!sprint) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-center py-4">
          <p className="text-sm text-slate-500">No active sprint</p>
        </div>
      </div>
    );
  }

  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
              Active Sprint
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{sprint.name}</h3>
          <p className="text-sm text-slate-600 mt-1">
            {formatDate(startDate)} - {formatDate(endDate)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">{sprint.daysRemaining}</div>
          <div className="text-xs text-slate-500">
            {sprint.daysRemaining === 1 ? "day" : "days"} remaining
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Time Progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-slate-700">Time Progress</span>
            <span className="font-semibold text-slate-900">{sprint.timeProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all"
              style={{ width: `${sprint.timeProgress}%` }}
            />
          </div>
        </div>

        {/* Items Progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-slate-700">Items Progress</span>
            <span className="font-semibold text-slate-900">
              {sprint.completedDeliverables} / {sprint.totalDeliverables} ({sprint.itemsProgress}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div
              className="bg-emerald-600 h-2.5 rounded-full transition-all"
              style={{ width: `${sprint.itemsProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

