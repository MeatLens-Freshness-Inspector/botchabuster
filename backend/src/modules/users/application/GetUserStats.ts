import type { ProfileService } from "../infrastructure/ProfileService";
export class GetUserStats {
  constructor(private readonly service: Pick<ProfileService, "getUserStats">) {}
  execute(): ReturnType<ProfileService["getUserStats"]> { return this.service.getUserStats(); }
}
