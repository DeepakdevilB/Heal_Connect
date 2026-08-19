import { prisma } from './src/lib/prisma';
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  console.log('USERS:', users);
  const wallets = await prisma.wallet.findMany({ select: { id: true, userId: true, balance: true } });
  console.log('WALLETS:', wallets);
}
main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
