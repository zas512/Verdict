import { plainToInstance } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync
} from "class-validator";

export enum NodeEnv {
  Development = "development",
  Production = "production",
  Test = "test"
}

/**
 * Every environment variable the API depends on. Validated once at bootstrap so
 * a misconfigured deployment fails immediately instead of surfacing as a
 * confusing 401/500 on the first request that happens to read the variable.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = "http://localhost:3000";

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN: string;

  // Optional: signed Cloudinary uploads for task attachments. The API boots
  // without them; /tasks/uploads/signature degrades to a clear error until
  // all three are present.
  @IsString()
  @IsOptional()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_KEY?: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_SECRET?: string;

  // Optional: Google OAuth (sign-in via Gmail). When any value is missing, the
  // web client hides the "Continue with Google" button and /auth/google
  // returns 503. The rest of auth (invites, manual registration) still works.
  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CALLBACK_URL?: string;

  // Optional: Resend outbound invite email. When the key is missing, invites
  // are still created and the invite link is returned to the inviter.
  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;

  @IsString()
  @IsOptional()
  RESEND_FROM_EMAIL: string = "LGA <onboarding@lga.dev>";

  // Public origin of the web app, used to build invite links in emails.
  @IsString()
  @IsOptional()
  WEB_APP_URL: string = "http://localhost:3000";
}

export function validateEnv(
  raw: Record<string, unknown>
): EnvironmentVariables {
  const config = plainToInstance(EnvironmentVariables, raw, {
    enableImplicitConversion: true,
    exposeDefaultValues: true
  });

  const errors = validateSync(config, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(", "))
      .join("\n  - ");
    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }

  return config;
}
