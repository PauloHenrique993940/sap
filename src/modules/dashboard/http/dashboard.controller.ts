import { Request, Response } from 'express';
import { prisma } from '../../../shared/prisma/client';

export class DashboardController {
  async summary(_req: Request, res: Response) {
    const now = new Date();
    const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [stocks, pendingRequests, expiringBatches, deliveredRequests] = await Promise.all([
      prisma.inventoryStock.findMany({
        include: {
          product: { select: { id: true, minStock: true } },
        },
      }),
      prisma.materialRequest.count({ where: { status: 'PENDENTE' } }),
      prisma.batch.count({
        where: {
          expiresAt: {
            gte: now,
            lte: next30,
          },
        },
      }),
      prisma.materialRequest.findMany({
        where: {
          status: 'ENTREGUE',
          deliveredAt: { gte: last30 },
        },
        select: {
          costCenter: true,
          items: {
            select: {
              deliveredQty: true,
            },
          },
        },
      }),
    ]);

    const productBalance = new Map<string, { available: number; minStock: number }>();
    for (const stock of stocks) {
      const current = productBalance.get(stock.product.id) ?? {
        available: 0,
        minStock: stock.product.minStock,
      };
      current.available += stock.quantityOnHand - stock.quantityReserved;
      productBalance.set(stock.product.id, current);
    }

    const criticalProducts = Array.from(productBalance.values()).filter(
      (p) => p.available < p.minStock
    ).length;

    const consumptionByCostCenterMap = new Map<string, number>();
    for (const req of deliveredRequests) {
      const totalDelivered = req.items.reduce((sum, item) => sum + (item.deliveredQty ?? 0), 0);
      const current = consumptionByCostCenterMap.get(req.costCenter) ?? 0;
      consumptionByCostCenterMap.set(req.costCenter, current + totalDelivered);
    }

    const consumptionByCostCenter = Array.from(consumptionByCostCenterMap.entries()).map(
      ([costCenter, quantity]) => ({ costCenter, quantity })
    );

    res.status(200).json({
      kpis: {
        totalItemsOnHand: stocks.reduce((sum, stock) => sum + stock.quantityOnHand, 0),
        criticalProducts,
        pendingRequests,
        expiringBatches,
      },
      consumptionByCostCenter,
    });
  }
}
