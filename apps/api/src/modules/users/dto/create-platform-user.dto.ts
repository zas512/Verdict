import { Transform } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";
import { PLATFORM_ROLES, type PlatformRole } from "./firm-member.dto";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

/**
 * Manual user creation by a SUPER_ADMIN into a tenant firm. Unlike
 * CreateFirmMemberDto the caller may assign any platform role (OWNER included)
 * and supplies the initial password the user must change at first login.
 */
export class CreatePlatformUserDto {
  @IsEmail({}, { message: "Please enter a valid email address" })
  @Transform(trim)
  email!: string;

  @IsIn(PLATFORM_ROLES, { message: "Role must be OWNER, ADMIN or ASSOCIATE" })
  @IsOptional()
  role?: PlatformRole;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @MaxLength(72) // bcrypt silently truncates beyond 72 bytes
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  @Transform(trim)
  name?: string;
}
