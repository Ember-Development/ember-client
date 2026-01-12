import "dotenv/config";
import { PrismaClient, UserType, InternalRole, ClientRole, ProjectStatus, ProjectPhase } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "ember-studio" },
    update: {},
    create: { name: "Ember Studio", slug: "ember-studio" },
  });

  const owner = await prisma.user.upsert({
    where: { authUserId: "demo_internal_owner" },
    update: {},
    create: {
      tenantId: tenant.id,
      authUserId: "demo_internal_owner",
      email: "owner@ember.dev",
      userType: UserType.INTERNAL,
      internalRole: InternalRole.OWNER,
    },
  });

  const clientUser = await prisma.user.upsert({
    where: { authUserId: "demo_client_admin" },
    update: {},
    create: {
      tenantId: tenant.id,
      authUserId: "demo_client_admin",
      email: "client@acme.com",
      userType: UserType.CLIENT,
      clientRole: ClientRole.CLIENT_ADMIN,
    },
  });

  const client = await prisma.client.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "acme" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "ACME Co",
      slug: "acme",
      status: "Active",
    },
  });

  const project = await prisma.project.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "goatnet-v1" } },
    update: {},
    create: {
      tenantId: tenant.id,
      clientId: client.id,
      name: "Goatnet V1",
      slug: "goatnet-v1",
      status: ProjectStatus.ACTIVE,
      phase: ProjectPhase.BUILD,
      description: "Beefed V1 portal + studio OS",
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    },
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: clientUser.id } },
    update: {},
    create: {
      projectId: project.id,
      userId: clientUser.id,
      clientRole: ClientRole.CLIENT_ADMIN,
    },
  });

  await prisma.milestone.createMany({
    data: [
      { projectId: project.id, title: "Discovery + scope lock", status: "DONE" },
      { projectId: project.id, title: "Core portal pages", status: "IN_PROGRESS" },
      { projectId: project.id, title: "Change request workflow", status: "NOT_STARTED" },
    ],
    skipDuplicates: true,
  });

  await prisma.projectUpdate.create({
    data: {
      projectId: project.id,
      authorId: owner.id,
      type: "WEEKLY",
      title: "Week 1 update",
      body: "Repo scaffold created. Next: auth + project pages + docs library.",
      clientVisible: true,
      externalLinks: ["https://www.figma.com/"],
    },
  });

  console.log("Seed complete.");
  console.log("Demo internal authUserId:", owner.authUserId);
  console.log("Demo client authUserId:", clientUser.authUserId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());

