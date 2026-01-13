-- First, get your tenant ID:
-- SELECT id, name, slug FROM "Tenant";

-- Then run this (replace 'YOUR_TENANT_ID' with the actual tenant ID):
INSERT INTO "User" (
  id,
  "tenantId",
  "authUserId",
  email,
  "userType",
  "internalRole",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid()::text,  -- or use a cuid generator
  'YOUR_TENANT_ID',  -- Replace with actual tenant ID
  'internal_gunnar_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 8),
  'gunnarsmith3@gmail.com',
  'INTERNAL',
  'ADMIN',  -- Change to OWNER, ADMIN, or MEMBER
  true,
  now(),
  now()
)
ON CONFLICT (email) DO NOTHING;

