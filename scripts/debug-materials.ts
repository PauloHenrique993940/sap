import { prisma } from '../src/shared/prisma/client';

async function main() {
  try {
    const total = await prisma.product.count();
    const materials = await prisma.product.findMany({
      take: 3,
      include: { category: { select: { id: true, name: true } } },
    });

    console.log(JSON.stringify({ ok: true, total, sample: materials.length }, null, 2));
  } catch (error) {
    console.error('PRISMA_ERROR', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
