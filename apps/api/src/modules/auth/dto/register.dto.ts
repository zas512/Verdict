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
import { AuthProvider } from "../../../generated/prisma/enums";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

/**
 * Registration is invite-only. `inviteToken` carries the role and firm; the
 * caller never supplies `role`. Founder invites (role OWNER) additionally send
 * firm-setup fields, which the service validates as required for that branch.
 */
export class RegisterDto {
  @IsEmail()
  @Transform(trim)
  email!: string;

  @IsString()
  @IsNotEmpty({ message: "inviteToken is required" })
  inviteToken!: string;

  /**
   * Optional at the DTO level: Google-registered accounts have no password.
   * The service requires it when authProvider is EMAIL.
   */
  @IsString()
  @IsOptional()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @MaxLength(72) // bcrypt silently truncates beyond 72 bytes
  password?: string;

  @IsIn([AuthProvider.EMAIL, AuthProvider.GOOGLE])
  @IsOptional()
  authProvider?: AuthProvider;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  googleId?: string;

  // Founder-only firm-setup fields (validated as required in the service).
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: "firmName is required for a founder invite" })
  firmName?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  accentColor?: string;

  @IsString()
  @IsOptional()
  tagline?: string;
}
