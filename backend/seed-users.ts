import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const hash = await bcrypt.hash('UserPassword@2026', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@healconnect.com' },
    update: {},
    create: {
      email: 'user@healconnect.com',
      name: 'John Doe',
      passwordHash: hash,
      isEmailVerified: true,
      phone: '+919999999999',
      isPhoneVerified: true,
    }
  });

  const p = await prisma.practitioner.findFirst();
  if (p) {
    // Create a support ticket for user
    await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: 'Billing issue with last call',
        category: 'BILLING',
        status: 'OPEN',
        messages: {
          create: [
            { senderType: 'USER', message: 'I was charged twice for my call with Dr. Sarah.' },
          ]
        }
      }
    });

    // Create a support ticket for practitioner
    await prisma.supportTicket.create({
      data: {
        practitionerId: p.id,
        subject: 'Cannot change online status',
        category: 'TECHNICAL',
        status: 'IN_PROGRESS',
        messages: {
          create: [
            { senderType: 'PRACTITIONER', message: 'Whenever I toggle the switch, it says network error.' },
          ]
        }
      }
    });
  }

  console.log('Seeded users and tickets!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
