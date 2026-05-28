import { NextFunction, Request, Response } from 'express';

export function asyncHandler<TReq extends Request = Request>(
  fn: (req: TReq, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: TReq, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
