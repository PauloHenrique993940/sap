import { Request, Response } from 'express';
import { InventoryService } from '../application/inventory.service';
import { prisma } from '../../../shared/prisma/client';
import { getRequestUser } from '../../../shared/http/get-request-user';

const inventoryService = new InventoryService();

export class InventoryController {
  async receive(req: Request, res: Response) {
    const user = getRequestUser(req);
    const result = await inventoryService.receiveStock({
      productId: req.body.productId,
      supplierId: req.body.supplierId,
      batchNumber: req.body.batchNumber,
      manufacturedAt: req.body.manufacturedAt ? new Date(req.body.manufacturedAt) : undefined,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      locationId: req.body.locationId,
      quantity: Number(req.body.quantity),
      reason: req.body.reason,
      performedById: user.id,
    });

    res.status(201).json(result);
  }

  async transfer(req: Request, res: Response) {
    const user = getRequestUser(req);
    const result = await inventoryService.transferStock({
      productId: req.body.productId,
      batchId: req.body.batchId,
      fromLocationId: req.body.fromLocationId,
      toLocationId: req.body.toLocationId,
      quantity: Number(req.body.quantity),
      reason: req.body.reason,
      performedById: user.id,
    });

    res.status(200).json(result);
  }

  async listStocks(req: Request, res: Response) {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const sku = (req.query.sku as string | undefined)?.trim();
    const categoryId = (req.query.categoryId as string | undefined)?.trim();
    const addressCode = (req.query.addressCode as string | undefined)?.trim();
    const search = (req.query.search as string | undefined)?.trim();
    const criticalOnly = String(req.query.criticalOnly ?? 'false') === 'true';

    const where = {
      product: {
        ...(sku ? { sku: { contains: sku, mode: 'insensitive' as const } } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { sku: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      location: {
        ...(addressCode
          ? { addressCode: { contains: addressCode, mode: 'insensitive' as const } }
          : {}),
      },
    };

    const [stocks, total] = await Promise.all([
      prisma.inventoryStock.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              minStock: true,
              unit: true,
              category: { select: { id: true, name: true } },
            },
          },
          location: {
            select: { id: true, addressCode: true },
          },
          batch: {
            select: { id: true, batchNumber: true, expiresAt: true },
          },
        },
      }),
      prisma.inventoryStock.count({ where }),
    ]);

    const normalized = stocks
      .map((stock) => {
        const available = stock.quantityOnHand - stock.quantityReserved;
        const isCritical = available < stock.product.minStock;
        return {
          id: stock.id,
          productId: stock.product.id,
          sku: stock.product.sku,
          productName: stock.product.name,
          category: stock.product.category,
          unit: stock.product.unit,
          minStock: stock.product.minStock,
          quantityOnHand: stock.quantityOnHand,
          quantityReserved: stock.quantityReserved,
          quantityAvailable: available,
          isCritical,
          addressCode: stock.location.addressCode,
          batch: stock.batch,
          updatedAt: stock.updatedAt,
        };
      })
      .filter((item) => (criticalOnly ? item.isCritical : true));

    res.status(200).json({
      data: normalized,
      pagination: {
        page,
        pageSize,
        total,
      },
    });
  }
}
