import { MovementType, Prisma, RequestStatus, UnitOfMeasure } from '@prisma/client';
import { AppError } from '../../../shared/errors/app-error';
import { prisma } from '../../../shared/prisma/client';
import {
  CreateMaterialRequestInput,
  DecideMaterialRequestInput,
  DeliverRequestItemInput,
  ReserveRequestItemInput,
} from './request.types';

function assertPositiveQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError('Quantidade deve ser um inteiro positivo', 422);
  }
}

async function isProductBelowMinStock(
  tx: Prisma.TransactionClient,
  productId: string
): Promise<boolean> {
  const [product, aggregate] = await Promise.all([
    tx.product.findUnique({
      where: { id: productId },
      select: { minStock: true },
    }),
    tx.inventoryStock.aggregate({
      where: { productId },
      _sum: {
        quantityOnHand: true,
        quantityReserved: true,
      },
    }),
  ]);

  if (!product) {
    throw new AppError('Produto nao encontrado', 404);
  }

  const onHand = aggregate._sum.quantityOnHand ?? 0;
  const reserved = aggregate._sum.quantityReserved ?? 0;
  const available = onHand - reserved;

  return available < product.minStock;
}

export class RequestService {
  async createRequest(input: CreateMaterialRequestInput) {
    if (input.items.length === 0) {
      throw new AppError('A requisicao precisa de ao menos um item', 422);
    }

    return prisma.$transaction(async (tx) => {
      const request = await tx.materialRequest.create({
        data: {
          code: `REQ-${Date.now()}`,
          requesterId: input.requesterId,
          costCenter: input.costCenter,
          department: input.department,
          notes: input.notes,
          items: {
            createMany: {
              data: input.items.map((item) => ({
                productId: item.productId,
                requestedQty: item.requestedQty,
                unit: item.unit as UnitOfMeasure,
                justification: item.justification,
              })),
            },
          },
        },
        include: {
          items: true,
        },
      });

      return request;
    });
  }

  async listRequests(status?: RequestStatus) {
    return prisma.materialRequest.findMany({
      where: {
        ...(status ? { status } : {}),
      },
      orderBy: { requestedAt: 'desc' },
      include: {
        requester: {
          select: { id: true, name: true, role: true },
        },
        approver: {
          select: { id: true, name: true, role: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, sku: true, name: true },
            },
          },
        },
      },
    });
  }

  async decideRequest(input: DecideMaterialRequestInput) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.materialRequest.findUnique({
        where: { id: input.requestId },
      });

      if (!request) {
        throw new AppError('Requisicao nao encontrada', 404);
      }

      if (request.status !== RequestStatus.PENDENTE) {
        throw new AppError('Apenas requisicoes pendentes podem ser decididas', 409);
      }

      const nextStatus =
        input.action === 'APROVAR' ? RequestStatus.APROVADO : RequestStatus.RECUSADO;

      if (nextStatus === RequestStatus.RECUSADO && !input.rejectionReason) {
        throw new AppError('Motivo de recusa e obrigatorio', 422);
      }

      const updated = await tx.materialRequest.update({
        where: { id: request.id },
        data: {
          status: nextStatus,
          approverId: input.decidedById,
          decidedAt: new Date(),
          rejectionReason:
            nextStatus === RequestStatus.RECUSADO ? input.rejectionReason : null,
        },
      });

      return updated;
    });
  }

  async reserveRequestItem(input: ReserveRequestItemInput) {
    assertPositiveQuantity(input.quantity);

    return prisma.$transaction(async (tx) => {
      const request = await tx.materialRequest.findUnique({
        where: { id: input.requestId },
        select: { id: true, status: true },
      });

      if (!request) {
        throw new AppError('Requisicao nao encontrada', 404);
      }

      if (
        request.status !== RequestStatus.PENDENTE &&
        request.status !== RequestStatus.APROVADO
      ) {
        throw new AppError('Requisicao nao esta em estado de reserva', 409);
      }

      const item = await tx.materialRequestItem.findUnique({
        where: { id: input.requestItemId },
      });

      if (!item || item.requestId !== input.requestId) {
        throw new AppError('Item da requisicao nao encontrado', 404);
      }

      if (input.quantity > item.requestedQty) {
        throw new AppError('Quantidade de reserva maior que a solicitada', 409);
      }

      const stock = await tx.inventoryStock.findUnique({
        where: {
          stock_balance_unique: {
            productId: item.productId,
            locationId: input.locationId,
            batchId: input.batchId,
          },
        },
      });

      if (!stock) {
        throw new AppError('Saldo para reserva nao encontrado', 404);
      }

      const available = stock.quantityOnHand - stock.quantityReserved;
      if (available < input.quantity) {
        throw new AppError('Saldo disponivel insuficiente para reserva', 409, {
          available,
          requested: input.quantity,
        });
      }

      const updateResult = await tx.inventoryStock.updateMany({
        where: {
          id: stock.id,
          version: stock.version,
          quantityOnHand: { gte: stock.quantityReserved + input.quantity },
        },
        data: {
          quantityReserved: { increment: input.quantity },
          version: { increment: 1 },
          lastMovementAt: new Date(),
        },
      });

      if (updateResult.count !== 1) {
        throw new AppError('Conflito de concorrencia na reserva de saldo', 409);
      }

      await tx.materialRequestItem.update({
        where: { id: item.id },
        data: {
          approvedQty: input.quantity,
          allocatedBatchId: input.batchId,
          allocatedLocationId: input.locationId,
        },
      });

      await tx.materialRequest.update({
        where: { id: request.id },
        data: {
          status: RequestStatus.APROVADO,
          approverId: input.performedById,
          decidedAt: new Date(),
        },
      });

      const updatedStock = await tx.inventoryStock.findUniqueOrThrow({
        where: { id: stock.id },
      });

      const lowStock = await isProductBelowMinStock(tx, item.productId);

      await tx.auditLog.create({
        data: {
          movementType: MovementType.RESERVA,
          productId: item.productId,
          stockId: updatedStock.id,
          batchId: input.batchId,
          toLocationId: input.locationId,
          requestId: input.requestId,
          requestItemId: item.id,
          performedById: input.performedById,
          quantity: input.quantity,
          beforeOnHand: stock.quantityOnHand,
          afterOnHand: updatedStock.quantityOnHand,
          beforeReserved: stock.quantityReserved,
          afterReserved: updatedStock.quantityReserved,
          metadata: {
            lowStock,
            flow: 'reserva-requisicao',
          },
        },
      });

      return {
        requestId: input.requestId,
        requestItemId: item.id,
        reservedQty: input.quantity,
        stockId: updatedStock.id,
        lowStock,
      };
    });
  }

  async deliverRequestItem(input: DeliverRequestItemInput) {
    assertPositiveQuantity(input.quantity);

    return prisma.$transaction(async (tx) => {
      const item = await tx.materialRequestItem.findUnique({
        where: { id: input.requestItemId },
      });

      if (!item || item.requestId !== input.requestId) {
        throw new AppError('Item da requisicao nao encontrado', 404);
      }

      if (!item.allocatedBatchId || !item.allocatedLocationId) {
        throw new AppError('Item sem alocacao de lote/endereco para entrega', 409);
      }

      const stock = await tx.inventoryStock.findUnique({
        where: {
          stock_balance_unique: {
            productId: item.productId,
            locationId: item.allocatedLocationId,
            batchId: item.allocatedBatchId,
          },
        },
      });

      const location = await tx.warehouseLocation.findUnique({
        where: { id: item.allocatedLocationId },
        select: { id: true, capacityUsed: true },
      });

      if (!stock || !location) {
        throw new AppError('Saldo alocado nao encontrado', 404);
      }

      if (stock.quantityReserved < input.quantity) {
        throw new AppError('Quantidade reservada insuficiente para entrega', 409);
      }

      const updated = await tx.inventoryStock.updateMany({
        where: {
          id: stock.id,
          version: stock.version,
          quantityReserved: { gte: input.quantity },
          quantityOnHand: { gte: input.quantity },
        },
        data: {
          quantityReserved: { decrement: input.quantity },
          quantityOnHand: { decrement: input.quantity },
          version: { increment: 1 },
          lastMovementAt: new Date(),
        },
      });

      if (updated.count !== 1) {
        throw new AppError('Conflito de concorrencia na entrega', 409);
      }

      await tx.materialRequestItem.update({
        where: { id: item.id },
        data: {
          deliveredQty: input.quantity,
        },
      });

      await tx.materialRequest.update({
        where: { id: input.requestId },
        data: {
          status: RequestStatus.ENTREGUE,
          deliveredAt: new Date(),
          approverId: input.performedById,
        },
      });

      const updatedStock = await tx.inventoryStock.findUniqueOrThrow({
        where: { id: stock.id },
      });

      await tx.warehouseLocation.update({
        where: { id: item.allocatedLocationId },
        data: {
          capacityUsed: new Prisma.Decimal(
            Math.max(0, Number(location.capacityUsed) - Number(input.quantity))
          ),
        },
      });

      const lowStock = await isProductBelowMinStock(tx, item.productId);

      await tx.auditLog.create({
        data: {
          movementType: MovementType.BAIXA_FISICA,
          productId: item.productId,
          stockId: stock.id,
          batchId: item.allocatedBatchId,
          fromLocationId: item.allocatedLocationId,
          requestId: input.requestId,
          requestItemId: item.id,
          performedById: input.performedById,
          quantity: input.quantity,
          beforeOnHand: stock.quantityOnHand,
          afterOnHand: updatedStock.quantityOnHand,
          beforeReserved: stock.quantityReserved,
          afterReserved: updatedStock.quantityReserved,
          metadata: {
            lowStock,
            flow: 'entrega-requisicao',
          },
        },
      });

      return {
        requestId: input.requestId,
        requestItemId: item.id,
        deliveredQty: input.quantity,
        quantityOnHand: updatedStock.quantityOnHand,
        lowStock,
      };
    });
  }
}
