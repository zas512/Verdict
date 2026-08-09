import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import type { SignOptions } from "jsonwebtoken";
import { toEntity } from "../../common/serialization/serialize";
import type { EnvironmentVariables } from "../../config/env.validation";
import { AuthProvider, UserRole } from "../../generated/prisma/enums";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BCRYPT_ROUNDS } from "./auth.constants";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateInviteDto } from "./dto/create-invite.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AuthUserEntity } from "./entities/auth.entity";
import { InviteEntity } from "./entities/invite.entity";
import type { JwtPayload } from "./strategies/access-token.strategy";
import type { GoogleProfileUser } from "./strategies/google.strategy";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface InviteResult {
  id: string;
  email: string;
  role: UserRole;
  type: "FOUNDER" | "MEMBER";
  inviteUrl: string;
}

/** Invites are valid for 7 days, matching the refresh-token lifetime. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly mailService: MailService
  ) {}

  /**
   * Invite-gated registration. The invite token determines everything: role
   * (a founder OWNER creates a new firm; a member ADMIN/ASSOCIATE joins an
   * existing one), the email the invite belongs to, and expiry. Self-serve
   * registration no longer exists.
   */
  async register(dto: RegisterDto): Promise<AuthTokens> {
    const invite = await this.prisma.firmInvite.findUnique({
      where: { token: dto.inviteToken },
      include: { firm: { select: { name: true } } }
    });

    if (!invite) {
      throw new NotFoundException("Invite token is invalid or has been revoked");
    }
    if (invite.status === "REVOKED" || invite.status === "ACCEPTED") {
      throw new ConflictException(
        "This invite has already been used or revoked"
      );
    }
    if (invite.expiresAt < new Date()) {
      await this.prisma.firmInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" }
      });
      throw new GoneException("This invite has expired");
    }
    if (dto.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new BadRequestException(
        "This invite is for a different email address"
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true }
    });
    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const authProvider = dto.authProvider ?? AuthProvider.EMAIL;
    if (authProvider === AuthProvider.GOOGLE && !dto.googleId) {
      throw new BadRequestException(
        "googleId is required when registering with Google"
      );
    }
    if (authProvider === AuthProvider.EMAIL && !dto.password) {
      throw new BadRequestException(
        "Password is required for manual registration"
      );
    }

    const isFounder = invite.role === UserRole.OWNER && !invite.firmId;
    if (isFounder && !dto.firmName) {
      throw new BadRequestException(
        "firmName is required when creating a new firm"
      );
    }

    // A Google-only account gets an unusable random hash so it can never be
    // signed in with a known password.
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
      : await bcrypt.hash(randomBytes(32).toString("hex"), BCRYPT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      let firmId = invite.firmId;
      if (isFounder) {
        const firm = await tx.firm.create({
          data: {
            name: dto.firmName!,
            logoUrl: dto.logoUrl ?? null,
            accentColor: dto.accentColor ?? null,
            tagline: dto.tagline ?? null
          }
        });
        firmId = firm.id;
      }

      const created = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name ?? null,
          passwordHash,
          avatarUrl: dto.avatarUrl ?? null,
          googleId: dto.googleId ?? null,
          authProvider,
          role: invite.role,
          firmId
        }
      });

      await tx.firmInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" }
      });

      return created;
    });

    return this.issueAndPersistTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });

    // Compare against a throwaway hash for unknown accounts — and for Google-only
    // accounts with no passwordHash — so the response time does not reveal
    // whether an email is registered.
    const passwordMatches = user?.passwordHash
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : await bcrypt.compare(dto.password, DUMMY_HASH);

    if (!user || !user.isActive || !passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueAndPersistTokens(user);
  }

  async refresh(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException("Access denied");
    }

    const tokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash
    );
    if (!tokenMatches) {
      throw new UnauthorizedException("Access denied");
    }

    return this.issueAndPersistTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null }
    });
  }

  /**
   * Replaces a provisioned/first-login password. Re-mints the tokens so the
   * new access token carries `mustChangePassword: false` and the server-side
   * first-login gate clears without another round trip.
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto
  ): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true }
    });
    if (!user?.passwordHash) {
      throw new BadRequestException("This account has no password set");
    }

    const currentMatches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash
    );
    if (!currentMatches) {
      throw new BadRequestException("Current password is incorrect");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS),
        mustChangePassword: false
      },
      select: {
        id: true,
        email: true,
        role: true,
        firmId: true,
        name: true,
        mustChangePassword: true
      }
    });

    return this.issueAndPersistTokens(updated);
  }

  async getMe(payload: JwtPayload): Promise<AuthUserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        firmId: true,
        isActive: true,
        mustChangePassword: true,
        associateId: true,
        firm: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            accentColor: true,
            tagline: true
          }
        }
      }
    });

    if (!user?.isActive) {
      throw new UnauthorizedException();
    }

    const activeShift = user.associateId
      ? await this.prisma.attendance.findFirst({
          where: { associateId: user.associateId, checkOut: null },
          select: { checkIn: true }
        })
      : null;

    const isCheckedIn = activeShift !== null;
    const activeCheckInTime = activeShift?.checkIn ?? null;

    return toEntity(AuthUserEntity, {
      sub: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      firmId: user.firmId,
      firm: user.firm,
      mustChangePassword: user.mustChangePassword,
      isCheckedIn,
      activeCheckInTime
    });
  }

  /**
   * Google callback outcome:
   * - Existing user: link the Google identity (merge) and sign them in.
   * - New Google account WITH an invite `state`: hand back a short-lived code
   *   carrying their profile so the register page can prefill it.
   * - New Google account WITHOUT an invite: null → login page "no account".
   */
  async googleCallback(
    profile: GoogleProfileUser | undefined,
    state: string | undefined
  ): Promise<
    | { tokens: AuthTokens; role: UserRole }
    | { code: string; invite: string }
    | null
  > {
    if (!profile || !profile.email) {
      return null;
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: profile.email }, { googleId: profile.googleId }]
      }
    });

    if (user) {
      if (!user.isActive) {
        throw new UnauthorizedException("Account is inactive");
      }
      if (!user.googleId) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.googleId,
            authProvider: AuthProvider.GOOGLE,
            avatarUrl: user.avatarUrl ?? profile.picture
          }
        });
      }
      const tokens = await this.issueAndPersistTokens(user);
      return { tokens, role: user.role };
    }

    if (!state) {
      return null;
    }

    const code = await this.jwtService.signAsync(
      {
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        purpose: "google-profile"
      },
      {
        secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }),
        expiresIn: "5m"
      }
    );
    return { code, invite: state };
  }

  async getGoogleProfile(code: string): Promise<{
    googleId: string;
    email: string;
    name: string | null;
    picture: string | null;
  }> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        googleId: string;
        email: string;
        name: string | null;
        picture: string | null;
        purpose: string;
      }>(code, { secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }) });

      if (payload.purpose !== "google-profile") {
        throw new BadRequestException("Invalid Google profile code");
      }
      return {
        googleId: payload.googleId,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException("Invalid or expired Google profile code");
    }
  }

  async getInvite(token: string): Promise<InviteEntity> {
    const invite = await this.prisma.firmInvite.findUnique({
      where: { token },
      include: { firm: { select: { name: true } } }
    });

    if (!invite) {
      throw new NotFoundException("Invite not found");
    }
    if (invite.expiresAt < new Date() && invite.status === "PENDING") {
      await this.prisma.firmInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" }
      });
      throw new GoneException("This invite has expired");
    }

    return toEntity(InviteEntity, {
      id: invite.id,
      email: invite.email,
      type:
        invite.role === UserRole.OWNER && !invite.firmId
          ? "FOUNDER"
          : "MEMBER",
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      firmName: invite.firm?.name ?? null
    });
  }

  /** Member invite: joins the inviter's firm as ADMIN or ASSOCIATE. */
  async createInvite(
    inviter: JwtPayload,
    dto: CreateInviteDto
  ): Promise<InviteResult> {
    const firm = await this.prisma.firm.findUnique({
      where: { id: inviter.firmId ?? "" }
    });
    if (!firm) {
      throw new ForbiddenException(
        "You must belong to a firm to send invitations"
      );
    }

    const open = await this.prisma.firmInvite.findFirst({
      where: { email: dto.email, firmId: firm.id, status: "PENDING" }
    });
    if (open) {
      throw new ConflictException(
        "An open invitation already exists for this email"
      );
    }

    const role = dto.role ?? UserRole.ASSOCIATE;
    const token = randomBytes(24).toString("base64url");
    const invite = await this.prisma.firmInvite.create({
      data: {
        email: dto.email,
        token,
        role,
        firmId: firm.id,
        invitedById: inviter.sub,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS)
      }
    });

    const inviteUrl = `${this.config.get("WEB_APP_URL", {
      infer: true
    })}/register?invite=${token}`;

    // Fire-and-forget: a missing/misconfigured mailer must not fail the request.
    void this.mailService.sendInviteEmail({
      to: dto.email,
      inviteUrl,
      firmName: firm.name,
      role
    });

    return {
      id: invite.id,
      email: invite.email,
      role,
      type: "MEMBER",
      inviteUrl
    };
  }

  /** Founder invite: creates a brand-new firm when accepted. SUPER_ADMIN only. */
  async createFounderInvite(
    inviter: JwtPayload,
    email: string
  ): Promise<InviteResult> {
    const open = await this.prisma.firmInvite.findFirst({
      where: { email, firmId: null, status: "PENDING" }
    });
    if (open) {
      throw new ConflictException(
        "An open founder invitation already exists for this email"
      );
    }

    const token = randomBytes(24).toString("base64url");
    const invite = await this.prisma.firmInvite.create({
      data: {
        email,
        token,
        role: UserRole.OWNER,
        firmId: null,
        invitedById: inviter.sub,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS)
      }
    });

    const inviteUrl = `${this.config.get("WEB_APP_URL", {
      infer: true
    })}/register?invite=${token}`;

    void this.mailService.sendInviteEmail({
      to: email,
      inviteUrl,
      firmName: null,
      role: UserRole.OWNER
    });

    return {
      id: invite.id,
      email: invite.email,
      role: UserRole.OWNER,
      type: "FOUNDER",
      inviteUrl
    };
  }

  private async issueAndPersistTokens(user: {
    id: string;
    email: string;
    role: UserRole;
    firmId: string | null;
    name: string | null;
    mustChangePassword: boolean;
  }): Promise<AuthTokens> {
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      firmId: user.firmId,
      name: user.name,
      mustChangePassword: user.mustChangePassword
    });
    await this.saveRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }),
        expiresIn: this.expiresIn("JWT_ACCESS_EXPIRES_IN")
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get("JWT_REFRESH_SECRET", { infer: true }),
        expiresIn: this.expiresIn("JWT_REFRESH_EXPIRES_IN")
      })
    ]);
    return { accessToken, refreshToken };
  }

  private expiresIn(
    key: "JWT_ACCESS_EXPIRES_IN" | "JWT_REFRESH_EXPIRES_IN"
  ): NonNullable<SignOptions["expiresIn"]> {
    const value = this.config.get(key, { infer: true });
    // "3600" means seconds, "15m" is a duration string; jsonwebtoken needs the
    // former as a number.
    return /^\d+$/.test(value)
      ? Number(value)
      : (value as NonNullable<SignOptions["expiresIn"]>);
  }

  private async saveRefreshTokenHash(userId: string, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash }
    });
  }
}

/** bcrypt hash of a value no user can supply; only used to equalise timing. */
const DUMMY_HASH =
  "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
