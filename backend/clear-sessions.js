const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.session.updateMany({
    where: { status: 'ACTIVE' },
    data: { status: 'COMPLETED', endTime: new Date() }
  });
  console.log(`Updated ${result.count} stuck sessions.`);
}

main().finally(() => prisma.$disconnect());
