require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Latest Sessions:", sessions.map(s => ({
    id: s.id,
    status: s.status,
    startTime: s.startTime,
    endTime: s.endTime,
    createdAt: s.createdAt,
    ageSeconds: (Date.now() - new Date(s.createdAt).getTime()) / 1000
  })));
  
  const practitioner = await prisma.practitioner.findFirst();
  console.log("Practitioner:", practitioner.name, "isOnline:", practitioner.isOnline);
}

check().finally(() => prisma.$disconnect());
