import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import type { EnvironmentVariables } from "../../config/env.validation";
import { CloudinaryModule } from "../cloudinary/cloudinary.module";
import { MailModule } from "../mail/mail.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleOAuthGuard } from "./guards/google-oauth.guard";
import {
  AccessTokenStrategy,
  ACCESS_TOKEN_STRATEGY
} from "./strategies/access-token.strategy";
import {
  buildGoogleStrategy,
  GoogleStrategy
} from "./strategies/google.strategy";
import { RefreshTokenStrategy } from "./strategies/refresh-token.strategy";

@Module({
  imports: [
    // Stateless API: no sessions, access token is the default strategy.
    PassportModule.register({
      defaultStrategy: ACCESS_TOKEN_STRATEGY,
      session: false
    }),
    // Secrets are supplied per-signature in AuthService because access and
    // refresh tokens use different keys.
    JwtModule.register({}),
    MailModule,
    CloudinaryModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    {
      // Factory so the app boots without Google creds: returns a no-op
      // placeholder strategy; the guard 503s before it is ever invoked.
      provide: GoogleStrategy,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        buildGoogleStrategy(config)
    },
    GoogleOAuthGuard
  ],
  exports: [AuthService]
})
export class AuthModule {}
