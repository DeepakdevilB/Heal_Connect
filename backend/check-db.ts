import { prisma } from './src/lib/prisma';

async function main() {
  const id = '4ba0d313-9e17-4d37-9e2b-38ad1d928bf9';
  const practitioner = await prisma.practitioner.update({
    where: { id },
    data: { isOnline: true },
  });
  console.log('--- UPDATED PRACTITIONER TO ONLINE ---');
  console.log(practitioner);
}

main().catch(console.error);
