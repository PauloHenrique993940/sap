import { Role } from '@prisma/client';

export type ReserveRequestItemInput = {
  requestId: string;
  requestItemId: string;
  locationId: string;
  batchId: string;
  quantity: number;
  performedById: string;
};

export type DeliverRequestItemInput = {
  requestId: string;
  requestItemId: string;
  quantity: number;
  performedById: string;
};

export type CreateMaterialRequestInput = {
  requesterId: string;
  requesterRole: Role;
  costCenter: string;
  department?: string;
  notes?: string;
  items: Array<{
    productId: string;
    requestedQty: number;
    unit: 'UN' | 'KG' | 'CX';
    justification?: string;
  }>;
};

export type DecideMaterialRequestInput = {
  requestId: string;
  action: 'APROVAR' | 'RECUSAR';
  rejectionReason?: string;
  decidedById: string;
};
