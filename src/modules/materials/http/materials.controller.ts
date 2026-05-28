import { Request, Response } from 'express';
import { prisma } from '../../../shared/prisma/client';
import { AppError } from '../../../shared/errors/app-error';

export class MaterialsController {
  async list(req: Request, res: Response) {
    const search = (req.query.search as string | undefined)?.trim();
    const activeOnly = String(req.query.activeOnly ?? 'false') === 'true';

    const materials = await prisma.product.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { category: { name: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    res.status(200).json({ data: materials });
  }

  async create(req: Request, res: Response) {
    const body = req.body;

    const category = await prisma.productCategory.upsert({
      where: { name: body.categoryName.trim() },
      update: {},
      create: {
        name: body.categoryName.trim(),
      },
    });

    const created = await prisma.product.create({
      data: {
        sku: body.sku.trim(),
        barcode: body.barcode?.trim() || null,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        categoryId: category.id,
        unit: body.unit,
        minStock: body.minStock,
        maxStock: body.maxStock ?? null,
        costPrice: body.costPrice,
        isActive: body.isActive ?? true,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json(created);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const body = req.body;

    const material = await prisma.product.findUnique({ where: { id } });
    if (!material) {
      throw new AppError('Material nao encontrado', 404);
    }

    let categoryId: string | undefined;
    if (body.categoryName) {
      const category = await prisma.productCategory.upsert({
        where: { name: body.categoryName.trim() },
        update: {},
        create: { name: body.categoryName.trim() },
      });
      categoryId = category.id;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(body.sku !== undefined ? { sku: body.sku.trim() } : {}),
        ...(body.barcode !== undefined ? { barcode: body.barcode?.trim() || null } : {}),
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(body.unit !== undefined ? { unit: body.unit } : {}),
        ...(body.minStock !== undefined ? { minStock: body.minStock } : {}),
        ...(body.maxStock !== undefined ? { maxStock: body.maxStock } : {}),
        ...(body.costPrice !== undefined ? { costPrice: body.costPrice } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(200).json(updated);
  }

  async remove(req: Request, res: Response) {
    const { id } = req.params;

    const material = await prisma.product.findUnique({ where: { id } });
    if (!material) {
      throw new AppError('Material nao encontrado', 404);
    }

    const deactivated = await prisma.product.update({
      where: { id },
      data: { isActive: false },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(200).json({
      message: 'Material inativado com sucesso',
      data: deactivated,
    });
  }
}
