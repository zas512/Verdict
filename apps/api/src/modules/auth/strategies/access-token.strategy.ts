import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { UserRole } from "../../../generated/prisma/enums";
import type { EnvironmentVariables } from "../../../config/env.validation";
import { ACCESS_TOKEN_COOKIE } from "../auth.constants";
import { cookieExtractor } from "../extractors/cookie.extractor";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  firmId: string | null;
  name?: string | null;
  /** True until the account's provisioned password has been replaced. */
  mustChangePassword: boolean;
}

export const ACCESS_TOKEN_STRATEGY = "jwt-access";

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  ACCESS_TOKEN_STRATEGY
) {
  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor(ACCESS_TOKEN_COOKIE)
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get("JWT_ACCESS_SECRET", { infer: true })
    });
  }
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
