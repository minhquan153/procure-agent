import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
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
      fullName: 'Finance Manager',
      role: Role.MANAGER,
      departmentCode: 'FIN',
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
    };

    await prisma.user.upsert({
      where: { email: user.email },
      update: data,
      create: { email: user.email, ...data },
    });
  }

  console.log(
    `Seeded ${departments.length} departments and ${users.length} users.`,
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
