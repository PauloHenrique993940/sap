import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/app-error';
import { prisma } from '../../../shared/prisma/client';

export class AuditController {
  async timeline(req: Request, res: Response) {
    const productId = (req.query.productId as string | undefined)?.trim();
    const batchId = (req.query.batchId as string | undefined)?.trim();
    const limit = Math.min(200, Number(req.query.limit ?? 100));

    if (!productId && !batchId) {
      throw new AppError('Informe productId ou batchId para reconstruir timeline', 422);
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(batchId ? { batchId } : {}),
      },
      orderBy: { performedAt: 'asc' },
      take: limit,
      include: {
        performedBy: {
          select: { id: true, name: true, role: true },
        },
        fromLocation: {
          select: { id: true, addressCode: true },
        },
        toLocation: {
          select: { id: true, addressCode: true },
        },
        batch: {
          select: { id: true, batchNumber: true, expiresAt: true },
        },
      },
    });

    res.status(200).json({
      data: logs.map((log) => ({
        id: log.id,
        movementType: log.movementType,
        quantity: log.quantity,
        beforeOnHand: log.beforeOnHand,
        afterOnHand: log.afterOnHand,
        beforeReserved: log.beforeReserved,
        afterReserved: log.afterReserved,
        reason: log.reason,
        performedAt: log.performedAt,
        performedBy: log.performedBy,
        from: log.fromLocation,
        to: log.toLocation,
        batch: log.batch,
        metadata: log.metadata,
      })),
    });
  }
}
