import { z } from 'zod';
import { UnitOfMeasure } from '@prisma/client';

const baseMaterialPayload = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(160),
  unit: z.nativeEnum(UnitOfMeasure),
  costPrice: z.number().positive(),
  minStock: z.number().int().min(0),
  maxStock: z.number().int().min(0).optional().nullable(),
  barcode: z.string().max(64).optional().nullable(),
  description: z.string().max(3000).optional().nullable(),
  categoryName: z.string().min(1).max(80),
  isActive: z.boolean().optional(),
});

export const listMaterialsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    search: z.string().optional(),
    activeOnly: z.coerce.boolean().optional(),
  }),
});

export const createMaterialSchema = z.object({
  body: baseMaterialPayload,
  params: z.object({}),
  query: z.object({}),
});

export const updateMaterialSchema = z.object({
  body: baseMaterialPayload.partial(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}),
});

export const deleteMaterialSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}),
});
