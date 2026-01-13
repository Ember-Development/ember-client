import "dotenv/config";
import { PrismaClient, UserType, InternalRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function addUser(email: string, internalRole: InternalRole) {
  // Find or get the tenant (assuming ember-studio based on seed)
  const tenant = await prisma.tenant.findFirst({
    where: { slug: "ember-studio" },
  });

  if (!tenant) {
    console.error("❌ No tenant found. Please create a tenant first or update the script.");
    return;
  }

  // Generate a unique authUserId
  const authUserId = `internal_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    console.log(`⚠️  User ${email} already exists:`);
    console.log(`   ID: ${existingUser.id}`);
    console.log(`   Role: ${existingUser.internalRole}`);
    return;
  }

  // Create the user
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      authUserId,
      email: email.toLowerCase(),
      userType: UserType.INTERNAL,
      internalRole,
      isActive: true,
    },
  });

  console.log(`✅ User ${email} created successfully:`);
  console.log(`   📧 Email: ${user.email}`);
  console.log(`   🔑 Auth User ID: ${user.authUserId}`);
  console.log(`   👤 Role: ${user.internalRole}\n`);
}

async function main() {
  console.log("Adding internal users...\n");
  
  // Add users
  await addUser("gunnarsmith3@gmail.com", InternalRole.ADMIN);
  await addUser("peter@goatnet.com", InternalRole.MEMBER);
  
  console.log("Done!");
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

