import { prisma } from "@/lib/db/prisma";
import { ProjectPhase } from ".prisma/client";

const phaseLabels: Record<ProjectPhase, string> = {
  DISCOVERY: "Discovery",
  DESIGN: "Design",
  BUILD: "Build",
  QA: "QA",
  LAUNCH: "Launch",
  SUPPORT: "Support",
};

export async function createPhaseMilestone(
  projectId: string,
  phase: ProjectPhase
) {
  // Check if a milestone for this phase already exists
  const existingMilestone = await prisma.milestone.findFirst({
    where: {
      projectId,
      title: {
        contains: phaseLabels[phase],
      },
    },
  });

  if (existingMilestone) {
    return existingMilestone;
  }

  // Get the highest orderIndex to place this milestone at the end
  const lastMilestone = await prisma.milestone.findFirst({
    where: { projectId },
    orderBy: { orderIndex: "desc" },
  });

  const orderIndex = lastMilestone ? lastMilestone.orderIndex + 1 : 0;

  return await prisma.milestone.create({
    data: {
      projectId,
      title: `${phaseLabels[phase]} Phase`,
      description: `Project entered the ${phaseLabels[phase]} phase.`,
      status: "NOT_STARTED",
      orderIndex,
      clientVisible: true,
    },
  });
}

