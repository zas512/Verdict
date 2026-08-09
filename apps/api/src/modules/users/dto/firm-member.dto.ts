import { PartialType } from "@nestjs/mapped-types";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";
import { UserRole } from "../../../generated/prisma/enums";

/** The only roles a firm administrator may hand out. */
export const FIRM_MEMBER_ROLES = [
  UserRole.ADMIN,
  UserRole.ASSOCIATE
] as const;

export type FirmMemberRole = (typeof FIRM_MEMBER_ROLES)[number];

/** Roles a platform SUPER_ADMIN may hand out to a tenant firm (incl. OWNER). */
export const PLATFORM_ROLES = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.ASSOCIATE
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateFirmMemberDto {
  @IsEmail({}, { message: "Please enter a valid email address" })
  @Transform(trim)
  email!: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @MaxLength(72) // bcrypt silently truncates beyond 72 bytes
  password!: string;

  /**
   * `@IsIn` rather than `@IsEnum(UserRole)`: escalating to OWNER/SUPER_ADMIN is
   * now rejected by validation with a 400 instead of reaching the service.
   */
  @IsIn(FIRM_MEMBER_ROLES, { message: "Role must be ADMIN or ASSOCIATE" })
  @IsOptional()
  role?: FirmMemberRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsOptional()
  name?: string;
}

export class UpdateFirmMemberDto extends PartialType(CreateFirmMemberDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
