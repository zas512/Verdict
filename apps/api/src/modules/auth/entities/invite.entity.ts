import { Expose } from "class-transformer";
import type { InviteStatus, UserRole } from "../../../generated/prisma/enums";

/**
 * What a `/auth/invites/:token` consumer needs: whether the invite creates a
 * new firm (FOUNDER) or joins one (MEMBER), plus the firm name for the intro.
 */
export class InviteEntity {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  type: "FOUNDER" | "MEMBER";

  @Expose()
  role: UserRole;

  @Expose()
  status: InviteStatus;

  @Expose()
  expiresAt: Date;

  @Expose()
  firmName: string | null;
}
