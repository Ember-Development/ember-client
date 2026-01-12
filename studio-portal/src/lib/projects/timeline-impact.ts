import { Project } from ".prisma/client";

interface TimelineImpact {
  delayDays: number;
  newDueDate: Date;
}

/**
 * Calculates the timeline impact of a change request based on estimated hours
 * @param estimatedHours - The estimated hours needed for the change
 * @param project - The project object with capacity and due date
 * @returns Object with delay in days and new projected due date
 */
export function calculateTimelineImpact(
  estimatedHours: number,
  project: Project
): TimelineImpact {
  // Default to 40 hours per week if not set
  const weeklyCapacityHours = project.weeklyCapacityHours || 40;
  
  // Calculate daily capacity (hours per day)
  const dailyCapacityHours = weeklyCapacityHours / 7;
  
  // Calculate delay in days (round up to account for partial days)
  const delayDays = Math.ceil(estimatedHours / dailyCapacityHours);
  
  // Get current due date
  const currentDueDate = project.dueDate;
  
  // Calculate new due date
  const newDueDate = new Date(currentDueDate);
  newDueDate.setDate(newDueDate.getDate() + delayDays);
  
  return {
    delayDays,
    newDueDate,
  };
}

/**
 * Formats timeline impact for display
 */
export function formatTimelineImpact(impact: TimelineImpact): {
  delayText: string;
  newDueDateText: string;
} {
  const delayText =
    impact.delayDays === 1
      ? "1 day"
      : impact.delayDays < 7
      ? `${impact.delayDays} days`
      : impact.delayDays < 14
      ? `${Math.round(impact.delayDays / 7)} week`
      : `${Math.round(impact.delayDays / 7)} weeks`;

  const newDueDateText = impact.newDueDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return {
    delayText,
    newDueDateText,
  };
}
