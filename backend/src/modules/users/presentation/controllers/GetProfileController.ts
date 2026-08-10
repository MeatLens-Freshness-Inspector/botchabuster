import type { NextFunction, Request, Response } from "express";
import type { UserProfile } from "../../domain/ports/UserRepository";
import { UserView } from "../views/UserView";

interface GetProfileQuery {
  execute(userId: string): Promise<UserProfile>;
}

export class GetProfileController {
  constructor(private readonly query: GetProfileQuery) {}

  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await this.query.execute(req.params.id ?? "");
      res.json(UserView.profile(profile));
    } catch (error) {
      next(error);
    }
  }
}
