const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  console.log('USERS:', users);
  const practitioners = await prisma.practitioner.findMany({ select: { id: true, email: true, name: true } });
  console.log('PRACTITIONERS:', practitioners);
}
main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
