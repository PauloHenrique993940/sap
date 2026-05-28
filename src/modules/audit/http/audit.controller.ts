import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/app-error';
import { prisma } from '../../../shared/prisma/client';

type TimelineEvent = {
  id: string;
  movementType: string;
  quantity: number;
  beforeOnHand: number | null;
  afterOnHand: number | null;
  beforeReserved: number | null;
  afterReserved: number | null;
  reason: string | null;
  performedAt: Date;
  performedBy: {
    id: string;
    name: string;
    role: string;
  } | null;
  from: {
    id: string;
    addressCode: string;
  } | null;
  to: {
    id: string;
    addressCode: string;
  } | null;
  batch: {
    id: string;
    batchNumber: string;
    expiresAt: Date | null;
  } | null;
  metadata: unknown;
};

export class AuditController {
  async timeline(req: Request, res: Response) {
    const productRef = (req.query.productId as string | undefined)?.trim();
    const batchId = (req.query.batchId as string | undefined)?.trim();
    const limit = Math.min(200, Number(req.query.limit ?? 100));

    if (!productRef && !batchId) {
      throw new AppError('Informe productId ou batchId para reconstruir timeline', 422);
    }

    let resolvedProductId: string | undefined;

    if (productRef) {
      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { id: productRef },
            { sku: productRef },
          ],
        },
        select: { id: true },
      });

      if (!product) {
        throw new AppError(`Produto nao encontrado para a referencia "${productRef}"`, 404);
      }

      resolvedProductId = product.id;
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(resolvedProductId ? { productId: resolvedProductId } : {}),
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

    const requestItems = resolvedProductId
      ? await prisma.materialRequestItem.findMany({
          where: {
            productId: resolvedProductId,
          },
          include: {
            request: {
              select: {
                id: true,
                code: true,
                status: true,
                requestedAt: true,
                decidedAt: true,
                deliveredAt: true,
                costCenter: true,
              },
            },
            allocatedLocation: {
              select: { id: true, addressCode: true },
            },
          },
          take: limit,
        })
      : [];

    const requestEvents: TimelineEvent[] = requestItems.flatMap((item) => {
      const events: TimelineEvent[] = [
        {
          id: `request-${item.id}`,
          movementType: 'REQUISICAO_CRIADA',
          quantity: item.requestedQty,
          beforeOnHand: null,
          afterOnHand: null,
          beforeReserved: null,
          afterReserved: null,
          reason: `Requisicao ${item.request.code} criada para ${item.request.costCenter}`,
          performedAt: item.request.requestedAt,
          performedBy: null,
          from: null,
          to: item.allocatedLocation,
          batch: null,
          metadata: {
            requestId: item.request.id,
            requestCode: item.request.code,
            requestStatus: item.request.status,
            source: 'request-flow',
          },
        },
      ];

      if (item.approvedQty !== null && item.request.decidedAt) {
        events.push({
          id: `approved-${item.id}`,
          movementType: 'REQUISICAO_APROVADA',
          quantity: item.approvedQty,
          beforeOnHand: null,
          afterOnHand: null,
          beforeReserved: null,
          afterReserved: null,
          reason: `Item aprovado para separacao na requisicao ${item.request.code}`,
          performedAt: item.request.decidedAt,
          performedBy: null,
          from: null,
          to: item.allocatedLocation,
          batch: null,
          metadata: {
            requestId: item.request.id,
            requestCode: item.request.code,
            requestStatus: item.request.status,
            source: 'request-flow',
          },
        });
      }

      if (item.deliveredQty !== null && item.request.deliveredAt) {
        events.push({
          id: `delivered-${item.id}`,
          movementType: 'REQUISICAO_ENTREGUE',
          quantity: item.deliveredQty,
          beforeOnHand: null,
          afterOnHand: null,
          beforeReserved: null,
          afterReserved: null,
          reason: `Item entregue na requisicao ${item.request.code}`,
          performedAt: item.request.deliveredAt,
          performedBy: null,
          from: item.allocatedLocation,
          to: null,
          batch: null,
          metadata: {
            requestId: item.request.id,
            requestCode: item.request.code,
            requestStatus: item.request.status,
            source: 'request-flow',
          },
        });
      }

      return events;
    });

    const timeline: TimelineEvent[] = [
      ...logs.map((log): TimelineEvent => ({
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
      ...requestEvents,
    ]
      .sort((left, right) => new Date(left.performedAt).getTime() - new Date(right.performedAt).getTime())
      .slice(0, limit);

    res.status(200).json({
      data: timeline,
    });
  }
}
