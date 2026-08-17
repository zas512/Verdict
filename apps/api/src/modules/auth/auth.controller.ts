import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { toEntity } from "../../common/serialization/serialize";
import type { EnvironmentVariables } from "../../config/env.validation";
import { UserRole } from "../../generated/prisma/enums";
import type { UploadSignature } from "../cloudinary/cloudinary.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { AuthService, type AuthTokens } from "./auth.service";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
  authCookieOptions
} from "./auth.constants";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Roles } from "./decorators/roles.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateInviteDto } from "./dto/create-invite.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AuthResultEntity, AuthUserEntity } from "./entities/auth.entity";
import { InviteEntity } from "./entities/invite.entity";
import { GoogleOAuthGuard } from "./guards/google-oauth.guard";
import { RefreshTokenGuard } from "./guards/refresh-token.guard";
import type { JwtPayload } from "./strategies/access-token.strategy";
import type { RefreshTokenPayload } from "./strategies/refresh-token.strategy";
import type { GoogleProfileUser } from "./strategies/google.strategy";

/** Credential endpoints get a tighter budget than the global 50 req/min. */
const CREDENTIAL_THROTTLE = { default: { limit: 5, ttl: 60_000 } };
/** Public onboarding upload signature: bounded so the bucket can't be flooded. */
const SIGNATURE_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly config: ConfigService<EnvironmentVariables, true>
  ) {}

  @Get("me")
  me(@CurrentUser() user: JwtPayload): Promise<AuthUserEntity> {
    return this.authService.getMe(user);
  }

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<AuthResultEntity> {
    const tokens = await this.authService.register(dto);
    this.setAuthCookies(response, tokens);
    return AuthController.result("Registered successfully");
  }

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<AuthResultEntity> {
    const tokens = await this.authService.login(dto);
    this.setAuthCookies(response, tokens);
    return AuthController.result("Logged in successfully");
  }

  /**
   * Access token is expired here — and RefreshTokenGuard authenticates instead.
   */
  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: RefreshTokenPayload,
    @Res({ passthrough: true }) response: Response
  ): Promise<AuthResultEntity> {
    const tokens = await this.authService.refresh(user.sub, user.refreshToken);
    this.setAuthCookies(response, tokens);
    return AuthController.result("Token refreshed successfully");
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) response: Response
  ): Promise<AuthResultEntity> {
    await this.authService.logout(user.sub);
    response.clearCookie(ACCESS_TOKEN_COOKIE, { path: "/" });
    response.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });
    return AuthController.result("Logged out successfully");
  }

  /** Authenticated (global guard). Re-mints tokens so the JWT clears too. */
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser("sub") sub: string,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<AuthResultEntity> {
    const tokens = await this.authService.changePassword(sub, dto);
    this.setAuthCookies(response, tokens);
    return AuthController.result("Password changed successfully");
  }

  /**
   * Starts the Google OAuth flow. The guard builds the authorize URL and
   * carries any `?invite=` token through the `state` parameter.
   */
  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get("google")
  googleAuth(): void {
    // Passport handles the redirect; this handler is never reached.
  }

  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get("google/callback")
  async googleCallback(
    @Req() request: Request & { user?: GoogleProfileUser },
    @Query("state") state: string | undefined,
    @Res() response: Response
  ): Promise<void> {
    const result = await this.authService.googleCallback(request.user, state);

    if (result && "tokens" in result) {
      this.setAuthCookies(response, result.tokens);
      const destination =
        result.role === UserRole.SUPER_ADMIN ? "/platform" : "/dashboard";
      response.redirect(`${this.webAppUrl()}${destination}`);
      return;
    }
    if (result && "code" in result) {
      response.redirect(
        `${this.webAppUrl()}/register?invite=${encodeURIComponent(
          result.invite
        )}&code=${encodeURIComponent(result.code)}`
      );
      return;
    }
    response.redirect(`${this.webAppUrl()}/login?google=no_account`);
  }

  /** Decodes the short-lived profile code minted for invite registration. */
  @Public()
  @Get("google/profile")
  googleProfile(@Query("code") code: string) {
    return this.authService.getGoogleProfile(code);
  }

  /** Validates an invite token so the register page can render the intro. */
  @Public()
  @Get("invites/:token")
  getInvite(@Param("token") token: string): Promise<InviteEntity> {
    return this.authService.getInvite(token);
  }

  /** Member invite: joins this firm as ADMIN or ASSOCIATE. */
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post("invites")
  createInvite(@CurrentUser() user: JwtPayload, @Body() dto: CreateInviteDto) {
    return this.authService.createInvite(user, dto);
  }

  /** Founder invite: creates a new firm when accepted. Platform only. */
  @Roles(UserRole.SUPER_ADMIN)
  @Post("invites/founder")
  createFounderInvite(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { email: string }
  ) {
    return this.authService.createFounderInvite(user, dto.email);
  }

  /** Signed Cloudinary upload credentials for onboarding logo/avatar files. */
  @Public()
  @Throttle(SIGNATURE_THROTTLE)
  @Get("uploads/signature")
  uploadsSignature(): UploadSignature {
    return this.cloudinaryService.signUpload({
      timestamp: Math.floor(Date.now() / 1000),
      folder: "lga/onboarding"
    });
  }

  private setAuthCookies(response: Response, tokens: AuthTokens): void {
    response.cookie(
      ACCESS_TOKEN_COOKIE,
      tokens.accessToken,
      authCookieOptions(ACCESS_TOKEN_COOKIE_MAX_AGE_MS)
    );
    response.cookie(
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      authCookieOptions(REFRESH_TOKEN_COOKIE_MAX_AGE_MS)
    );
  }

  private webAppUrl(): string {
    return this.config.get("WEB_APP_URL", { infer: true });
  }

  private static result(message: string): AuthResultEntity {
    return toEntity(AuthResultEntity, { success: true, message });
  }
}
