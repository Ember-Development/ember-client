import { requireProjectAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { UserType } from ".prisma/client";
import { MilestonesPageClient } from "@/components/milestones/MilestonesPageClient";

export default async function MilestonesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user, project } = await requireProjectAccess(projectId);

  if (user.userType !== UserType.INTERNAL) {
    return null;
  }

  const [milestones, projectMembers] = await Promise.all([
    prisma.milestone.findMany({
      where: { projectId: project.id },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId: project.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ]);

  // Calculate progress for each milestone
  const milestonesWithProgress = await Promise.all(
    milestones.map(async (milestone) => {
      const deliverables = await prisma.deliverable.findMany({
        where: { milestoneId: milestone.id },
      });

      const progress =
        deliverables.length > 0
          ? Math.round(
              (deliverables.filter((d) => d.status === "DONE").length / deliverables.length) * 100
            )
          : null;

      return {
        id: milestone.id,
        projectId: milestone.projectId,
        title: milestone.title,
        description: milestone.description,
        status: milestone.status,
        dueDate: milestone.dueDate?.toISOString() || null,
        requiresClientApproval: milestone.requiresClientApproval,
        approvalStatus: milestone.approvalStatus,
        approvalNotes: milestone.approvalNotes,
        assignedToId: milestone.assignedToId,
        assignedTo: milestone.assignedTo,
        clientVisible: milestone.clientVisible,
        orderIndex: milestone.orderIndex,
        progress,
        deliverablesCount: deliverables.length,
        completedDeliverablesCount: deliverables.filter((d) => d.status === "DONE").length,
        createdAt: milestone.createdAt.toISOString(),
        updatedAt: milestone.updatedAt.toISOString(),
        completedAt: milestone.completedAt?.toISOString() || null,
      };
    })
  );

  return (
    <MilestonesPageClient
      projectId={project.id}
      projectName={project.name}
      milestones={milestonesWithProgress}
      projectMembers={projectMembers}
    />
  );
}

