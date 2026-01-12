import { prisma } from "@/lib/db/prisma";
import { UpdateType } from ".prisma/client";

interface CreateProjectUpdateParams {
  projectId: string;
  authorId?: string | null;
  type?: UpdateType;
  title?: string | null;
  body: string;
  clientVisible?: boolean;
}

export async function createProjectUpdate({
  projectId,
  authorId,
  type = "GENERAL",
  title,
  body,
  clientVisible = true,
}: CreateProjectUpdateParams) {
  return await prisma.projectUpdate.create({
    data: {
      projectId,
      authorId: authorId || null,
      type,
      title,
      body,
      clientVisible,
    },
  });
}

const phaseLabels: Record<string, string> = {
  DISCOVERY: "Discovery",
  DESIGN: "Design",
  BUILD: "Build",
  QA: "QA",
  LAUNCH: "Launch",
  SUPPORT: "Support",
};

export async function createPhaseChangeUpdate(
  projectId: string,
  oldPhase: string,
  newPhase: string,
  authorId?: string
) {
  return await createProjectUpdate({
    projectId,
    authorId,
    type: "GENERAL",
    title: `Project Phase Changed`,
    body: `Project phase changed from **${phaseLabels[oldPhase] || oldPhase}** to **${phaseLabels[newPhase] || newPhase}**.`,
    clientVisible: true,
  });
}

export async function createDocumentUpdateUpdate(
  projectId: string,
  documentTitle: string,
  isNew: boolean,
  authorId?: string
) {
  return await createProjectUpdate({
    projectId,
    authorId,
    type: "GENERAL",
    title: isNew ? "Document Created" : "Document Updated",
    body: isNew
      ? `New document **${documentTitle}** has been created.`
      : `Document **${documentTitle}** has been updated.`,
    clientVisible: true,
  });
}

export async function createDeliverableStatusUpdate(
  projectId: string,
  deliverableTitle: string,
  oldStatus: string,
  newStatus: string,
  authorId?: string
) {
  const statusLabels: Record<string, string> = {
    BACKLOG: "Backlog",
    PLANNED: "Planned",
    IN_PROGRESS: "In Progress",
    QA: "QA",
    BLOCKED: "Blocked",
    DONE: "Done",
  };

  const isCompletion = newStatus === "DONE";
  const isStatusChange = oldStatus !== newStatus;

  if (!isStatusChange) return null;

  return await createProjectUpdate({
    projectId,
    authorId,
    type: isCompletion ? "LAUNCH" : "GENERAL",
    title: isCompletion ? "Deliverable Completed" : "Deliverable Status Changed",
    body: isCompletion
      ? `Deliverable **${deliverableTitle}** has been completed! 🎉`
      : `Deliverable **${deliverableTitle}** moved from **${statusLabels[oldStatus] || oldStatus}** to **${statusLabels[newStatus] || newStatus}**.`,
    clientVisible: true,
  });
}

export async function createMemberAddedUpdate(
  projectId: string,
  memberName: string,
  authorId?: string
) {
  return await createProjectUpdate({
    projectId,
    authorId,
    type: "GENERAL",
    title: "Team Member Added",
    body: `**${memberName}** has been added to the project team.`,
    clientVisible: true,
  });
}

export async function createChangeRequestUpdate(
  projectId: string,
  changeRequestTitle: string,
  authorId?: string,
  estimatedHours?: number | null,
  delayDays?: number | null,
  isApproved?: boolean
) {
  let body = "";
  if (isApproved) {
    body = `Change request **${changeRequestTitle}** has been approved.`;
    if (delayDays && delayDays > 0) {
      body += `\n\nThis will delay the project by **${delayDays}** day${delayDays !== 1 ? "s" : ""}.`;
    }
    if (estimatedHours) {
      body += `\n\nEstimated effort: **${estimatedHours}** hours.`;
    }
  } else {
    body = `New change request submitted: **${changeRequestTitle}**.`;
    if (estimatedHours) {
      body += `\n\nAI-estimated effort: **${estimatedHours}** hours.`;
    }
    if (delayDays && delayDays > 0) {
      body += `\n\nEstimated timeline impact: **${delayDays}** day${delayDays !== 1 ? "s" : ""} delay.`;
    }
  }

  return await createProjectUpdate({
    projectId,
    authorId,
    type: "GENERAL",
    title: isApproved ? "Change Request Approved" : "Change Request Submitted",
    body,
    clientVisible: true,
  });
}

