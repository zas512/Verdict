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
 * Durability of Idempotency-Key replay protection:
 *   disabled — validate the header only, no dedup (default; safe anywhere)
 *   memory   — in-memory store: dev/test only, resets on restart and is NOT
 *              shared across processes
 *   "table" is intentionally unsupported until the `IdempotencyRecord`
 *   migration lands (see ARCHITECTURE-STATUS.md, open problem #8).
 */
export enum IdempotencyStoreMode {
  Disabled = "disabled",
  Memory = "memory"
}

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
  @IsOptional()
  DIRECT_URL?: string;

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

  @IsString()
  @IsOptional()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_KEY?: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_SECRET?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CALLBACK_URL?: string;

  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;

  @IsString()
  @IsOptional()
  RESEND_FROM_EMAIL: string = "LGA <onboarding@lga.dev>";

  @IsString()
  @IsOptional()
  WEB_APP_URL: string = "http://localhost:3000";

  @IsString()
  @IsOptional()
  AI_SERVICE_URL: string = "http://localhost:5000/api/ai";

  @IsEnum(IdempotencyStoreMode)
  @IsOptional()
  IDEMPOTENCY_STORE: IdempotencyStoreMode = IdempotencyStoreMode.Disabled;
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
