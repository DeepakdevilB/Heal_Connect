import * as dotenv from 'dotenv';
dotenv.config();
import { prisma } from './src/lib/prisma';

async function updateBalance() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'deepaksharma.pith@gmail.com' }
    });

    if (!user) {
      console.log('User not found!');
      return;
    }

    const wallet = await prisma.wallet.update({
      where: { userId: user.id },
      data: { balance: 10000 }
    });

    console.log(`Successfully updated balance for ${user.email} to ₹${wallet.balance}`);
  } catch (error) {
    console.error('Error updating balance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateBalance();
