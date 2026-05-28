export type ReceiveStockInput = {
  productId: string;
  supplierId?: string;
  batchNumber: string;
  manufacturedAt?: Date;
  expiresAt?: Date;
  locationId: string;
  quantity: number;
  costPrice?: number;
  reason?: string;
  performedById: string;
};

export type TransferStockInput = {
  productId: string;
  batchId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  reason?: string;
  performedById: string;
};
