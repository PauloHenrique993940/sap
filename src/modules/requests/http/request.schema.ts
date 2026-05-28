import { z } from 'zod';

export const createRequestSchema = z.object({
  body: z.object({
    costCenter: z.string().min(1).max(60),
    department: z.string().max(80).optional(),
    notes: z.string().max(1000).optional(),
    items: z.array(
      z.object({
        productId: z.string().min(1),
        requestedQty: z.number().int().positive(),
        unit: z.enum(['UN', 'KG', 'CX']),
        justification: z.string().max(255).optional(),
      })
    ).min(1),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const reserveRequestItemSchema = z.object({
  body: z.object({
    locationId: z.string().min(1),
    batchId: z.string().min(1),
    quantity: z.number().int().positive(),
  }),
  params: z.object({
    requestId: z.string().min(1),
    itemId: z.string().min(1),
  }),
  query: z.object({}),
});

export const deliverRequestItemSchema = z.object({
  body: z.object({
    quantity: z.number().int().positive(),
  }),
  params: z.object({
    requestId: z.string().min(1),
    itemId: z.string().min(1),
  }),
  query: z.object({}),
});

export const decideRequestSchema = z.object({
  body: z.object({
    action: z.enum(['APROVAR', 'RECUSAR']),
    rejectionReason: z.string().max(255).optional(),
  }),
  params: z.object({
    requestId: z.string().min(1),
  }),
  query: z.object({}),
});
