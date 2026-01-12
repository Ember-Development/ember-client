import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "./session";
import { UserType } from ".prisma/client";

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireInternalUser() {
  const user = await requireUser();
  if (user.userType !== UserType.INTERNAL) redirect("/portal");
  return user;
}

export async function requireProjectAccess(projectId: string) {
  const user = await requireUser();

  // Internal can access all projects in their tenant
  if (user.userType === UserType.INTERNAL) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: user.tenantId },
      include: { client: true },
    });
    if (!project) redirect("/internal");
    return { user, project, membership: null };
  }

  // Client users must be a member of the project
  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId: user.id },
    include: { project: { include: { client: true } } },
  });

  if (!membership) redirect("/portal");
  return { user, project: membership.project, membership };
}

