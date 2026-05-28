import { MovementType, Prisma } from '@prisma/client';
import { AppError } from '../../../shared/errors/app-error';
import { prisma } from '../../../shared/prisma/client';
import { ReceiveStockInput, TransferStockInput } from './inventory.types';

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

export class InventoryService {
   async receiveStock(input: ReceiveStockInput) {
      assertPositiveQuantity(input.quantity);

      return prisma.$transaction(async (tx) => {
         const product = await tx.product.findUnique({
            where: { id: input.productId },
            select: { id: true },
         });

         if (!product) {
            throw new AppError('Produto nao encontrado', 404);
         }

         const location = await tx.warehouseLocation.findUnique({
            where: { id: input.locationId },
            select: { id: true, isBlocked: true, capacityLimit: true, capacityUsed: true },
         });

         if (!location) {
            throw new AppError('Endereco de estoque nao encontrado', 404);
         }

         if (location.isBlocked) {
            throw new AppError('Endereco de estoque bloqueado', 409);
         }

         const newCapacityUsed =
            Number(location.capacityUsed) + Number(input.quantity);

         if (
            location.capacityLimit !== null &&
            newCapacityUsed > Number(location.capacityLimit)
         ) {
            throw new AppError('Capacidade do endereco excedida', 409);
         }

         const batch = await tx.batch.upsert({
            where: {
               product_batch_number_key: {
                  productId: input.productId,
                  batchNumber: input.batchNumber,
               },
            },
            update: {
               manufacturedAt: input.manufacturedAt,
               expiresAt: input.expiresAt,
               supplierId: input.supplierId,
            },
            create: {
               productId: input.productId,
               supplierId: input.supplierId,
               batchNumber: input.batchNumber,
               manufacturedAt: input.manufacturedAt,
               expiresAt: input.expiresAt,
            },
         });

         let stock = await tx.inventoryStock.findUnique({
            where: {
               stock_balance_unique: {
                  productId: input.productId,
                  locationId: input.locationId,
                  batchId: batch.id,
               },
            },
         });

         if (!stock) {
            stock = await tx.inventoryStock.create({
               data: {
                  productId: input.productId,
                  locationId: input.locationId,
                  batchId: batch.id,
                  quantityOnHand: 0,
                  quantityReserved: 0,
               },
            });
         }

         const beforeOnHand = stock.quantityOnHand;
         const afterOnHand = beforeOnHand + input.quantity;

         const updatedStock = await tx.inventoryStock.update({
            where: { id: stock.id },
            data: {
               quantityOnHand: afterOnHand,
               version: { increment: 1 },
               lastMovementAt: new Date(),
            },
         });

         await tx.warehouseLocation.update({
            where: { id: input.locationId },
            data: { capacityUsed: new Prisma.Decimal(newCapacityUsed) },
         });

         const lowStock = await isProductBelowMinStock(tx, input.productId);

         await tx.auditLog.create({
            data: {
               movementType: MovementType.ENTRADA,
               productId: input.productId,
               stockId: updatedStock.id,
               batchId: batch.id,
               toLocationId: input.locationId,
               performedById: input.performedById,
               quantity: input.quantity,
               beforeOnHand,
               afterOnHand,
               beforeReserved: updatedStock.quantityReserved,
               afterReserved: updatedStock.quantityReserved,
               reason: input.reason,
               metadata: {
                  lowStock,
                  flow: 'recebimento',
               },
            },
         });

         return {
            stockId: updatedStock.id,
            batchId: batch.id,
            quantityOnHand: updatedStock.quantityOnHand,
            lowStock,
         };
      });
   }

   async transferStock(input: TransferStockInput) {
      assertPositiveQuantity(input.quantity);

      return prisma.$transaction(async (tx) => {
         const [fromLocation, toLocation] = await Promise.all([
            tx.warehouseLocation.findUnique({
               where: { id: input.fromLocationId },
               select: { id: true, isBlocked: true, capacityUsed: true },
            }),
            tx.warehouseLocation.findUnique({
               where: { id: input.toLocationId },
               select: { id: true, isBlocked: true, capacityLimit: true, capacityUsed: true },
            }),
         ]);

         if (!fromLocation || !toLocation) {
            throw new AppError('Endereco de origem ou destino nao encontrado', 404);
         }

         if (fromLocation.isBlocked || toLocation.isBlocked) {
            throw new AppError('Endereco bloqueado para movimentacao', 409);
         }

         const sourceStock = await tx.inventoryStock.findUnique({
            where: {
               stock_balance_unique: {
                  productId: input.productId,
                  locationId: input.fromLocationId,
                  batchId: input.batchId,
               },
            },
         });

         if (!sourceStock) {
            throw new AppError('Saldo de origem nao encontrado', 404);
         }

         const sourceAvailable = sourceStock.quantityOnHand - sourceStock.quantityReserved;
         if (sourceAvailable < input.quantity) {
            throw new AppError('Saldo disponivel insuficiente para transferencia', 409, {
               available: sourceAvailable,
            });
         }

         const newCapacityUsed = Number(toLocation.capacityUsed) + Number(input.quantity);
         if (
            toLocation.capacityLimit !== null &&
            newCapacityUsed > Number(toLocation.capacityLimit)
         ) {
            throw new AppError('Endereco de destino sem capacidade suficiente', 409);
         }

         let destinationStock = await tx.inventoryStock.findUnique({
            where: {
               stock_balance_unique: {
                  productId: input.productId,
                  locationId: input.toLocationId,
                  batchId: input.batchId,
               },
            },
         });

         if (!destinationStock) {
            destinationStock = await tx.inventoryStock.create({
               data: {
                  productId: input.productId,
                  locationId: input.toLocationId,
                  batchId: input.batchId,
                  quantityOnHand: 0,
                  quantityReserved: 0,
               },
            });
         }

         const sourceUpdate = await tx.inventoryStock.updateMany({
            where: {
               id: sourceStock.id,
               version: sourceStock.version,
               quantityOnHand: { gte: input.quantity + sourceStock.quantityReserved },
            },
            data: {
               quantityOnHand: { decrement: input.quantity },
               version: { increment: 1 },
               lastMovementAt: new Date(),
            },
         });

         if (sourceUpdate.count !== 1) {
            throw new AppError('Conflito de concorrencia no saldo de origem', 409);
         }

         const destinationUpdate = await tx.inventoryStock.updateMany({
            where: {
               id: destinationStock.id,
               version: destinationStock.version,
            },
            data: {
               quantityOnHand: { increment: input.quantity },
               version: { increment: 1 },
               lastMovementAt: new Date(),
            },
         });

         if (destinationUpdate.count !== 1) {
            throw new AppError('Conflito de concorrencia no saldo de destino', 409);
         }

         await Promise.all([
            tx.warehouseLocation.update({
               where: { id: input.fromLocationId },
               data: {
                  capacityUsed: new Prisma.Decimal(
                     Math.max(0, Number(fromLocation.capacityUsed) - Number(input.quantity))
                  ),
               },
            }),
            tx.warehouseLocation.update({
               where: { id: input.toLocationId },
               data: { capacityUsed: new Prisma.Decimal(newCapacityUsed) },
            }),
         ]);

         const [sourceAfter, destinationAfter] = await Promise.all([
            tx.inventoryStock.findUniqueOrThrow({ where: { id: sourceStock.id } }),
            tx.inventoryStock.findUniqueOrThrow({ where: { id: destinationStock.id } }),
         ]);

         const lowStock = await isProductBelowMinStock(tx, input.productId);

         await tx.auditLog.create({
            data: {
               movementType: MovementType.TRANSFERENCIA_INTERNA,
               productId: input.productId,
               batchId: input.batchId,
               fromLocationId: input.fromLocationId,
               toLocationId: input.toLocationId,
               performedById: input.performedById,
               quantity: input.quantity,
               beforeOnHand: sourceStock.quantityOnHand,
               afterOnHand: sourceAfter.quantityOnHand,
               beforeReserved: sourceStock.quantityReserved,
               afterReserved: sourceAfter.quantityReserved,
               reason: input.reason,
               metadata: {
                  destinationOnHand: destinationAfter.quantityOnHand,
                  lowStock,
                  flow: 'transferencia',
               },
            },
         });

         return {
            sourceStockId: sourceAfter.id,
            destinationStockId: destinationAfter.id,
            sourceOnHand: sourceAfter.quantityOnHand,
            destinationOnHand: destinationAfter.quantityOnHand,
            lowStock,
         };
      });
   }
}
