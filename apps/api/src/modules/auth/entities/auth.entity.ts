import { Expose, Type } from "class-transformer";
import type { UserRole } from "../../../generated/prisma/enums";

export class FirmBrandEntity {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  logoUrl: string | null;

  @Expose()
  accentColor: string | null;

  @Expose()
  tagline: string | null;
}

export class AuthUserEntity {
  @Expose()
  sub: string;

  @Expose()
  email: string;

  @Expose()
  name: string | null;

  @Expose()
  role: UserRole;

  @Expose()
  firmId: string | null;

  @Expose()
  mustChangePassword: boolean;

  @Expose()
  avatarUrl: string | null;

  @Expose()
  @Type(() => FirmBrandEntity)
  firm: FirmBrandEntity | null;

  @Expose()
  activeCheckInTime: Date | null;

  @Expose()
  isCheckedIn: boolean;
}

export class AuthResultEntity {
  @Expose()
  success: boolean;

  @Expose()
  message: string;
}
