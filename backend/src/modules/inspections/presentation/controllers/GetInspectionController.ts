import type { NextFunction, Request, Response } from "express";
import type { GetInspectionByIdRequest, InspectionRecord } from "../../domain/ports/InspectionRepository";
import { InspectionView } from "../views/InspectionView";

interface GetInspectionQuery {
  execute(input: GetInspectionByIdRequest): Promise<InspectionRecord>;
}

interface RequestAccessContext {
  userId: string;
  isAdmin: boolean;
}

type AccessContextResolver = (request: Request) => Promise<RequestAccessContext>;

export class GetInspectionController {
  constructor(
    private readonly query: GetInspectionQuery,
    private readonly resolveAccessContext: AccessContextResolver,
  ) {}

  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accessContext = await this.resolveAccessContext(req);
      const inspection = await this.query.execute({
        inspectionId: req.params.id ?? "",
        userId: accessContext.userId,
        includeAll: req.query.scope === "all" && accessContext.isAdmin,
      });
      res.json(InspectionView.detail(inspection));
    } catch (error) {
      next(error);
    }
  }
}
