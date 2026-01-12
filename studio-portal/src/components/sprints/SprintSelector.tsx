"use client";

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface SprintSelectorProps {
  sprints: Sprint[];
  selectedSprintId: string | null;
  onChange: (sprintId: string | null) => void;
  className?: string;
}

export function SprintSelector({
  sprints,
  selectedSprintId,
  onChange,
  className = "",
}: SprintSelectorProps) {
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  };

  return (
    <select
      value={selectedSprintId || ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={className}
    >
      <option value="">No Sprint</option>
      {sprints.map((sprint) => (
        <option key={sprint.id} value={sprint.id}>
          {sprint.name} ({formatDateRange(sprint.startDate, sprint.endDate)})
        </option>
      ))}
    </select>
  );
}

