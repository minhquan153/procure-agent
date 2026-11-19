import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/auth/password.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  const demoPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'ProcureDemo123!';
  if (demoPassword.length < 12) {
    throw new Error('SEED_DEFAULT_PASSWORD must be at least 12 characters');
  }
  const passwordHash = await hashPassword(demoPassword);
  const departments = await Promise.all(
    [
      { code: 'IT', name: 'IT' },
      { code: 'FIN', name: 'Finance' },
      { code: 'MKT', name: 'Marketing' },
    ].map((department) =>
      prisma.department.upsert({
        where: { code: department.code },
        update: { name: department.name },
        create: department,
      }),
    ),
  );

  const departmentByCode = new Map(
    departments.map((department) => [department.code, department.id]),
  );

  const users = [
    {
      email: 'admin@procure-agent.local',
      fullName: 'System Admin',
      role: Role.ADMIN,
      departmentCode: 'IT',
    },
    {
      email: 'manager@procure-agent.local',
      fullName: 'IT Manager',
      role: Role.MANAGER,
      departmentCode: 'IT',
    },
    {
      email: 'employee.it@procure-agent.local',
      fullName: 'IT Employee',
      role: Role.EMPLOYEE,
      departmentCode: 'IT',
    },
    {
      email: 'employee.marketing@procure-agent.local',
      fullName: 'Marketing Employee',
      role: Role.EMPLOYEE,
      departmentCode: 'MKT',
    },
    {
      email: 'procurement@procure-agent.local',
      fullName: 'Procurement Staff',
      role: Role.PROCUREMENT,
      departmentCode: 'FIN',
    },
  ];

  for (const user of users) {
    const departmentId = departmentByCode.get(user.departmentCode);

    if (!departmentId) {
      throw new Error(`Department ${user.departmentCode} was not seeded`);
    }

    const data = {
      fullName: user.fullName,
      role: user.role,
      departmentId,
      passwordHash,
      isActive: true,
    };

    await prisma.user.upsert({
      where: { email: user.email },
      update: data,
      create: { email: user.email, ...data },
    });
  }

  const fiscalYear = new Date().getFullYear();
  await Promise.all(
    departments.map((department) =>
      prisma.departmentBudget.upsert({
        where: {
          departmentId_fiscalYear: { departmentId: department.id, fiscalYear },
        },
        update: {},
        create: {
          departmentId: department.id,
          fiscalYear,
          budgetLimit: '100000',
        },
      }),
    ),
  );

  console.log(
    `Seeded ${departments.length} departments, ${users.length} users, and ${departments.length} budgets for ${fiscalYear}.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
