import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import {
  PrismaClient,
  ProjectStatus,
  TenantRole,
  UserStatus,
} from '../src/generated/prisma/client.js';

config({ path: resolve(process.cwd(), '../../.env'), quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Every seeded user signs in with this password
const PASSWORD = '123456';

const tenants = [
  { slug: 'acme', name: 'Acme Corporation' },
  { slug: 'globex', name: 'Globex Industries' },
  { slug: 'initech', name: 'Initech' },
  { slug: 'umbrella', name: 'Umbrella Holdings' },
  { slug: 'stark', name: 'Stark Enterprises' },
  { slug: 'wayne', name: 'Wayne Logistics' },
  { slug: 'hooli', name: 'Hooli' },
];

const { ADMIN, MEMBER } = TenantRole;

const users: {
  username: string;
  name: string;
  memberships: { tenant: string; role: TenantRole }[];
}[] = [
  // Admin of two tenants
  {
    username: 'alice',
    name: 'Alice Anderson',
    memberships: [
      { tenant: 'acme', role: ADMIN },
      { tenant: 'globex', role: ADMIN },
    ],
  },
  // Admin of one tenant, member of another
  {
    username: 'bob',
    name: 'Bob Brown',
    memberships: [
      { tenant: 'initech', role: ADMIN },
      { tenant: 'acme', role: MEMBER },
    ],
  },
  // Member of two tenants
  {
    username: 'carol',
    name: 'Carol Clark',
    memberships: [
      { tenant: 'globex', role: MEMBER },
      { tenant: 'initech', role: MEMBER },
    ],
  },
  // Single-tenant users
  {
    username: 'dave',
    name: 'Dave Davis',
    memberships: [{ tenant: 'umbrella', role: ADMIN }],
  },
  {
    username: 'erin',
    name: 'Erin Evans',
    memberships: [{ tenant: 'stark', role: ADMIN }],
  },
  {
    username: 'frank',
    name: 'Frank Foster',
    memberships: [{ tenant: 'wayne', role: ADMIN }],
  },
  {
    username: 'grace',
    name: 'Grace Green',
    memberships: [{ tenant: 'hooli', role: ADMIN }],
  },
  {
    username: 'heidi',
    name: 'Heidi Hughes',
    memberships: [{ tenant: 'umbrella', role: MEMBER }],
  },
  {
    username: 'ivan',
    name: 'Ivan Iverson',
    memberships: [{ tenant: 'stark', role: MEMBER }],
  },
  {
    username: 'judy',
    name: 'Judy Johnson',
    memberships: [{ tenant: 'hooli', role: MEMBER }],
  },
];

// Sample projects for the projects page, created by each tenant's first admin
const projects: {
  tenant: string;
  createdBy: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
}[] = [
  {
    tenant: 'acme',
    createdBy: 'alice',
    name: 'Rocket skates v2',
    description: 'Second generation of our best seller.',
    status: 'ON_TRACK',
    progress: 72,
  },
  {
    tenant: 'acme',
    createdBy: 'alice',
    name: 'Anvil supply chain',
    description: 'Find a second anvil supplier.',
    status: 'AT_RISK',
    progress: 41,
  },
  {
    tenant: 'acme',
    createdBy: 'alice',
    name: 'Catalog redesign',
    description: '',
    status: 'DONE',
    progress: 100,
  },
  {
    tenant: 'globex',
    createdBy: 'alice',
    name: 'Hammock district rollout',
    description: '',
    status: 'ON_TRACK',
    progress: 58,
  },
  {
    tenant: 'globex',
    createdBy: 'alice',
    name: 'Data center migration',
    description: 'Move workloads to the new region.',
    status: 'ON_TRACK',
    progress: 33,
  },
  {
    tenant: 'initech',
    createdBy: 'bob',
    name: 'TPS report automation',
    description: 'Cover sheets included.',
    status: 'AT_RISK',
    progress: 24,
  },
  {
    tenant: 'initech',
    createdBy: 'bob',
    name: 'Stapler inventory',
    description: '',
    status: 'DONE',
    progress: 100,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [tenantsBefore, usersBefore] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
  ]);

  const tenantIds = new Map<string, string>();
  for (const tenant of tenants) {
    const { id } = await prisma.tenant.upsert({
      where: { slug: tenant.slug },
      update: { name: tenant.name },
      create: tenant,
    });
    tenantIds.set(tenant.slug, id);
  }

  for (const { username, name, memberships } of users) {
    const user = await prisma.user.upsert({
      where: { username },
      update: { name, passwordHash, status: UserStatus.ACTIVE },
      create: {
        username,
        name,
        email: `${username}@example.com`,
        passwordHash,
      },
    });

    // Reset memberships so re-running the seeder matches the list above
    await prisma.tenantUser.deleteMany({ where: { userId: user.id } });
    await prisma.tenantUser.createMany({
      data: memberships.map(({ tenant, role }) => ({
        userId: user.id,
        tenantId: tenantIds.get(tenant)!,
        role,
      })),
    });
  }

  for (const { tenant, createdBy, ...project } of projects) {
    const tenantId = tenantIds.get(tenant)!;
    const creator = await prisma.user.findUniqueOrThrow({
      where: { username: createdBy },
    });
    await prisma.project.upsert({
      where: { tenantId_name: { tenantId, name: project.name } },
      update: project,
      create: { ...project, tenantId, createdById: creator.id },
    });
  }

  // Records are upserted by slug/username, so re-running never duplicates them
  const [tenantsAfter, usersAfter, memberships, projectCount] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.tenantUser.count(),
      prisma.project.count(),
    ]);
  console.log(
    `Tenants: ${tenantsAfter} total (${tenantsAfter - tenantsBefore} new)\n` +
      `Users: ${usersAfter} total (${usersAfter - usersBefore} new)\n` +
      `Memberships: ${memberships} total\n` +
      `Projects: ${projectCount} total\n` +
      `Password for every seeded user: ${PASSWORD}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
