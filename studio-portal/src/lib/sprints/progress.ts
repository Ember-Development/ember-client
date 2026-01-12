export interface SprintProgress {
  timeProgress: number;
  itemsProgress: number;
  totalDeliverables: number;
  completedDeliverables: number;
  daysRemaining: number;
}

export function calculateTimeProgress(
  startDate: Date | string,
  endDate: Date | string
): number {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  const now = new Date();

  if (now < start) return 0;
  if (now > end) return 100;

  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
}

export function calculateItemsProgress(
  deliverables: Array<{ status: string }>
): number {
  if (deliverables.length === 0) return 0;
  const completed = deliverables.filter((d) => d.status === "DONE").length;
  return Math.round((completed / deliverables.length) * 100);
}

export function getActiveSprint<T extends { startDate: Date | string; endDate: Date | string }>(
  sprints: T[]
): T | null {
  const now = new Date();
  return (
    sprints.find((sprint) => {
      const start = typeof sprint.startDate === "string" ? new Date(sprint.startDate) : sprint.startDate;
      const end = typeof sprint.endDate === "string" ? new Date(sprint.endDate) : sprint.endDate;
      return now >= start && now <= end;
    }) || null
  );
}

export function getDaysRemaining(endDate: Date | string): number {
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function calculateSprintProgress(
  sprint: {
    startDate: Date | string;
    endDate: Date | string;
    deliverables: Array<{ status: string }>;
  }
): SprintProgress {
  const timeProgress = calculateTimeProgress(sprint.startDate, sprint.endDate);
  const itemsProgress = calculateItemsProgress(sprint.deliverables);
  const totalDeliverables = sprint.deliverables.length;
  const completedDeliverables = sprint.deliverables.filter(
    (d) => d.status === "DONE"
  ).length;
  const daysRemaining = getDaysRemaining(sprint.endDate);

  return {
    timeProgress: Math.round(timeProgress),
    itemsProgress,
    totalDeliverables,
    completedDeliverables,
    daysRemaining,
  };
}

