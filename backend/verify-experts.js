const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAll() {
  const result = await prisma.practitioner.updateMany({
    data: { isVerified: true }
  });
  console.log(`Verified ${result.count} practitioners.`);
}

verifyAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
