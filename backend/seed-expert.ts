import * as dotenv from 'dotenv';
dotenv.config();
import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  // Expert
  const expertHash = await bcrypt.hash('Abhishek@1234', 12);
  const expert = await prisma.practitioner.upsert({
    where: { email: 'abhishekgiri1978@gmail.com' },
    update: { passwordHash: expertHash },
    create: {
      name: 'Abhishek Giri',
      email: 'abhishekgiri1978@gmail.com',
      passwordHash: expertHash,
      isVerified: true,
      isOnline: false,
      specialties: ['Energy Healing'],
      certifications: [],
      languages: ['Hindi', 'English'],
      experienceYrs: 2,
      perMinuteRate: 10,
    },
  });
  console.log('✅ Expert:', expert.email);

  // User
  const userHash = await bcrypt.hash('Abhishek@123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'abhishekgiri0405@gmail.com' },
    update: { passwordHash: userHash },
    create: {
      name: 'Abhishek User',
      email: 'abhishekgiri0405@gmail.com',
      passwordHash: userHash,
      isEmailVerified: true,
      provider: 'email',
    },
  });
  console.log('✅ User:', user.email);

  await prisma.$disconnect();
}

main().catch(console.error);
