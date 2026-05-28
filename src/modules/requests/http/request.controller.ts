import { Request, Response } from 'express';
import { RequestStatus } from '@prisma/client';
import { RequestService } from '../application/request.service';
import { getRequestUser } from '../../../shared/http/get-request-user';

const requestService = new RequestService();

export class RequestController {
  async create(req: Request, res: Response) {
    const user = getRequestUser(req);
    const result = await requestService.createRequest({
      requesterId: user.id,
      requesterRole: user.role,
      costCenter: req.body.costCenter,
      department: req.body.department,
      notes: req.body.notes,
      items: req.body.items,
    });

    res.status(201).json(result);
  }

  async list(req: Request, res: Response) {
    const statusRaw = req.query.status as RequestStatus | 'AGUARDANDO_RETIRADA' | undefined;
    const result = await requestService.listRequests(statusRaw);
    res.status(200).json({ data: result });
  }

  async decide(req: Request, res: Response) {
    const user = getRequestUser(req);
    const result = await requestService.decideRequest({
      requestId: req.params.requestId,
      action: req.body.action,
      rejectionReason: req.body.rejectionReason,
      decidedById: user.id,
    });

    res.status(200).json(result);
  }

  async reserveItem(req: Request, res: Response) {
    const user = getRequestUser(req);
    const result = await requestService.reserveRequestItem({
      requestId: req.params.requestId,
      requestItemId: req.params.itemId,
      locationId: req.body.locationId,
      batchId: req.body.batchId,
      quantity: Number(req.body.quantity),
      performedById: user.id,
    });

    res.status(200).json(result);
  }

  async deliverItem(req: Request, res: Response) {
    const user = getRequestUser(req);
    const result = await requestService.deliverRequestItem({
      requestId: req.params.requestId,
      requestItemId: req.params.itemId,
      quantity: Number(req.body.quantity),
      performedById: user.id,
    });

    res.status(200).json(result);
  }
}
