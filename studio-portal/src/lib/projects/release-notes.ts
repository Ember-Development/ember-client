import { prisma } from "@/lib/db/prisma";
import { createProjectUpdate } from "./updates";

export async function generateReleaseNotesForSprint(
  sprintId: string,
  projectId: string,
  authorId?: string
) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      deliverables: {
        where: {
          status: "DONE",
        },
        include: {
          assignee: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  });

  if (!sprint) {
    throw new Error("Sprint not found");
  }

  const completedDeliverables = sprint.deliverables;

  if (completedDeliverables.length === 0) {
    // Still create a release note, but mention no items were completed
    return await createProjectUpdate({
      projectId,
      authorId,
      type: "LAUNCH",
      title: `Sprint Completed: ${sprint.name}`,
      body: `Sprint **${sprint.name}** has been completed.\n\n*No deliverables were marked as done during this sprint.*`,
      clientVisible: true,
    });
  }

  // Group deliverables by status/type if needed, or just list them
  const deliverablesList = completedDeliverables
    .map((d) => {
      const assigneeName = d.assignee
        ? `${d.assignee.firstName || ""} ${d.assignee.lastName || ""}`.trim() || d.assignee.email
        : "Unassigned";
      return `- **${d.title}**${d.description ? ` - ${d.description}` : ""} (by ${assigneeName})`;
    })
    .join("\n");

  const body = `Sprint **${sprint.name}** has been completed! 🎉

## Completed Deliverables

${deliverablesList}

**Total Items Completed:** ${completedDeliverables.length}`;

  return await createProjectUpdate({
    projectId,
    authorId,
    type: "LAUNCH",
    title: `Sprint Completed: ${sprint.name}`,
    body,
    clientVisible: true,
  });
}

