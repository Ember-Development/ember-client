"use client";

interface MilestoneProgressProps {
  progress: number | null;
  total: number;
  completed: number;
  milestoneId: string;
  projectId: string;
}

export function MilestoneProgress({
  progress,
  total,
  completed,
  milestoneId,
  projectId,
}: MilestoneProgressProps) {
  if (progress === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-200 rounded-full">
          <div className="h-full w-0 bg-slate-300 rounded-full" />
        </div>
        <span className="text-xs text-slate-500 min-w-[60px] text-right">
          No deliverables
        </span>
      </div>
    );
  }

  const getProgressColor = () => {
    if (progress >= 67) return "bg-emerald-500";
    if (progress >= 34) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getProgressColor()} rounded-full transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-slate-600 min-w-[60px] text-right font-medium">
        {progress}%
      </span>
      <a
        href={`/internal/projects/${projectId}/kanban?milestone=${milestoneId}`}
        className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
        title={`${completed} of ${total} deliverables completed`}
      >
        {completed}/{total}
      </a>
    </div>
  );
}

