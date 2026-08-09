import { Expose, Type } from "class-transformer";
import type { UserRole } from "../../../generated/prisma/enums";

export class FirmSummaryEntity {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

/**
 * The single serialized representation of a user across the API. Only these
 * properties survive `plainToInstance(..., { excludeExtraneousValues: true })`,
 * so `passwordHash` and `refreshTokenHash` can never reach a response even if a
 * query forgets to narrow its `select`.
 */
export class UserEntity {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string | null;

  @Expose()
  role: UserRole;

  @Expose()
  firmId: string | null;

  @Expose()
  isActive: boolean;

  @Expose()
  mustChangePassword: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => FirmSummaryEntity)
  firm?: FirmSummaryEntity | null;
}
