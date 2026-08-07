const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const emailToKeep = 'deep.pgl.work@gmail.com';

  const practitionersToDelete = await prisma.practitioner.findMany({
    where: {
      email: {
        not: emailToKeep
      }
    },
    select: { id: true }
  });

  const ids = practitionersToDelete.map(p => p.id);

  if (ids.length === 0) {
    console.log('No experts to delete.');
    return;
  }

  console.log(`Found ${ids.length} experts to delete.`);

  // Manually cascade deletes
  await prisma.flaggedContent.deleteMany({
    where: { practitionerId: { in: ids } }
  });

  await prisma.callTranscript.deleteMany({
    where: { practitionerId: { in: ids } }
  });

  await prisma.callFeedback.deleteMany({
    where: { session: { practitionerId: { in: ids } } }
  });

  await prisma.chatMessage.deleteMany({
    where: { session: { practitionerId: { in: ids } } }
  });

  await prisma.review.deleteMany({
    where: { practitionerId: { in: ids } }
  });

  await prisma.session.deleteMany({
    where: { practitionerId: { in: ids } }
  });

  const result = await prisma.practitioner.deleteMany({
    where: {
      id: { in: ids }
    }
  });

  console.log(`Successfully deleted ${result.count} experts.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
