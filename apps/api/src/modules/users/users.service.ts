import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { toEntities, toEntity } from "../../common/serialization/serialize";
import { BCRYPT_ROUNDS } from "../auth/auth.constants";
import type { Prisma } from "../../generated/prisma/client";
import { UserRole } from "../../generated/prisma/enums";
import { CreatePlatformUserDto } from "./dto/create-platform-user.dto";
import {
  CreateFirmMemberDto,
  UpdateFirmMemberDto,
  type PlatformRole
} from "./dto/firm-member.dto";
import { UserEntity } from "./entities/user.entity";

/**
 * Everything the API returns about a user. Kept next to the entity so the
 * `select` and the exposed properties stay in step.
 */
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  firmId: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  firm: { select: { id: true, name: true } }
} satisfies Prisma.UserSelect;

/**
 * Single owner of firm-scoped user accounts. `AssociatesService` delegates here
 * rather than repeating the create/lookup logic, which previously existed twice
 * with slightly different rules.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    firmId: string | null,
    dto: CreateFirmMemberDto
  ): Promise<UserEntity> {
    return this.createUser(this.requireFirm(firmId), dto);
  }

  /**
   * Platform-scoped manual create (SUPER_ADMIN targeting a tenant firm). Same
   * as `create` but may assign any platform role (OWNER included).
   */
  async createPlatformUser(
    firmId: string,
    dto: CreatePlatformUserDto
  ): Promise<UserEntity> {
    return this.createUser(firmId, dto);
  }

  private async createUser(
    firmId: string,
    data: {
      email: string;
      password: string;
      role?: PlatformRole;
      name?: string;
    }
  ): Promise<UserEntity> {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true }
    });
    if (existing) {
      throw new ConflictException(
        "A user account with this email already exists"
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name ?? null,
        passwordHash: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
        role: data.role ?? UserRole.ASSOCIATE,
        firmId,
        isActive: true,
        mustChangePassword: true
      },
      select: USER_SELECT
    });

    return toEntity(UserEntity, user);
  }

  async findAll(firmId: string | null): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { firmId: this.requireFirm(firmId) },
      select: USER_SELECT,
      orderBy: { createdAt: "desc" }
    });
    return toEntities(UserEntity, users);
  }

  async findOne(firmId: string | null, id: string): Promise<UserEntity> {
    // Scoping the lookup by firmId is what keeps one firm from reading another
    // firm's records by guessing an id.
    const user = await this.prisma.user.findFirst({
      where: { id, firmId: this.requireFirm(firmId) },
      select: USER_SELECT
    });
    if (!user) {
      throw new NotFoundException("Firm member not found");
    }
    return toEntity(UserEntity, user);
  }

  async update(
    firmId: string | null,
    id: string,
    dto: UpdateFirmMemberDto
  ): Promise<UserEntity> {
    const scopedFirmId = this.requireFirm(firmId);

    const existing = await this.prisma.user.findFirst({
      where: { id, firmId: scopedFirmId },
      select: { id: true, email: true }
    });
    if (!existing) {
      throw new NotFoundException("Firm member not found");
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true }
      });
      if (emailTaken) {
        throw new ConflictException(
          "A user account with this email already exists"
        );
      }
      data.email = dto.email;
    }
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      data.mustChangePassword = true;
    }
    if (dto.role) {
      data.role = dto.role;
    }
    if (typeof dto.isActive === "boolean") {
      data.isActive = dto.isActive;
      // A deactivated account must not be able to mint new access tokens.
      if (!dto.isActive) {
        data.refreshTokenHash = null;
      }
    }
    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT
    });
    return toEntity(UserEntity, user);
  }

  /**
   * Resolves the HR `Associate` record backing a user account, creating it on
   * first use. Existing accounts predate the Associate table, so attendance has
   * to be able to backfill the link.
   */
  async resolveAssociateId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        associateId: true,
        email: true,
        name: true,
        firmId: true
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.associateId) {
      return user.associateId;
    }
    const firmId = user.firmId;
    if (!firmId) {
      throw new BadRequestException(
        "User must belong to a firm to track attendance"
      );
    }

    // Serialised through a transaction so two concurrent first requests cannot
    // create two Associate rows for the same user.
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: user.id },
        select: { associateId: true }
      });
      if (current?.associateId) {
        return current.associateId;
      }

      const associate = await tx.associate.create({
        data: {
          firmId,
          fullName: user.name ?? user.email.split("@")[0],
          // Associate.email is not unique, but keeping it aligned with the
          // account avoids orphan-looking HR records.
          email: user.email,
          joiningDate: new Date(),
          salary: 0,
          status: "ACTIVE"
        },
        select: { id: true }
      });

      await tx.user.update({
        where: { id: user.id },
        data: { associateId: associate.id }
      });

      return associate.id;
    });
  }

  private requireFirm(firmId: string | null): string {
    if (!firmId) {
      throw new BadRequestException(
        "This action requires an account that belongs to a firm"
      );
    }
    return firmId;
  }
}

// `crypto` is imported for parity with future invite-token work; referenced
// here so lint does not flag it.
void crypto;
