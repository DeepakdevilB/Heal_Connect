import { prisma } from './src/lib/prisma';

async function verifyAll() {
  const result = await prisma.practitioner.updateMany({
    data: { isVerified: true }
  });
  console.log(`Verified ${result.count} practitioners.`);
}

verifyAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
