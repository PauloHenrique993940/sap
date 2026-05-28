import { z } from 'zod';

export const receiveStockSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    supplierId: z.string().min(1).optional(),
    batchNumber: z.string().min(1),
    manufacturedAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    locationId: z.string().min(1),
    quantity: z.number().int().positive(),
    reason: z.string().max(255).optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const transferStockSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    batchId: z.string().min(1),
    fromLocationId: z.string().min(1),
    toLocationId: z.string().min(1),
    quantity: z.number().int().positive(),
    reason: z.string().max(255).optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const listStockSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    sku: z.string().optional(),
    categoryId: z.string().optional(),
    addressCode: z.string().optional(),
    criticalOnly: z.coerce.boolean().optional(),
    search: z.string().optional(),
  }),
});
