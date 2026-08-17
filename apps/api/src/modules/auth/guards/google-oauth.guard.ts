import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { AuthenticateOptions } from "passport";
import type { EnvironmentVariables } from "../../../config/env.validation";

/**
 * Passport's Google guard. Carries the invite token through the OAuth round
 * trip via the `state` parameter so a brand-new Google account can be routed
 * back to the invite registration page prefilled with their profile.
 */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard("google") {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>
  ) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext): AuthenticateOptions {
    const request = context.switchToHttp().getRequest<Request>();
    const invite = request.query?.invite;
    return { state: typeof invite === "string" ? invite : undefined };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.config.get("GOOGLE_CLIENT_ID", { infer: true })) {
      throw new ServiceUnavailableException("Google sign-in is not configured");
    }
    return (await super.canActivate(context)) as boolean;
  }
}
