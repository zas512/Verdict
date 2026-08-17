import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { toEntities, toEntity } from "../../common/serialization/serialize";
import { UserRole } from "../../generated/prisma/enums";
import { BCRYPT_ROUNDS } from "../auth/auth.constants";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePlatformUserDto } from "../users/dto/create-platform-user.dto";
import { UserEntity } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { CreateFirmDto } from "./dto/create-firm.dto";
import { FirmEntity } from "./entities/firm.entity";

@Injectable()
export class FirmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService
  ) {}

  async findAll(): Promise<FirmEntity[]> {
    const firms = await this.prisma.firm.findMany({
      include: {
        users: {
          where: { role: UserRole.OWNER },
          select: { name: true, email: true },
          orderBy: { createdAt: "asc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return toEntities(
      FirmEntity,
      firms.map((firm) => ({
        id: firm.id,
        name: firm.name,
        createdAt: firm.createdAt,
        ownerName: firm.users[0]?.name ?? "N/A",
        ownerEmail: firm.users[0]?.email ?? "N/A"
      }))
    );
  }

  async create(dto: CreateFirmDto): Promise<FirmEntity> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.ownerEmail },
      select: { id: true }
    });
    if (existingUser) {
      throw new ConflictException(
        "A user account with this email already exists"
      );
    }

    const passwordHash = await bcrypt.hash(dto.ownerPassword, BCRYPT_ROUNDS);

    const { firm, user } = await this.prisma.$transaction(async (tx) => {
      const createdFirm = await tx.firm.create({ data: { name: dto.name } });
      const createdUser = await tx.user.create({
        data: {
          email: dto.ownerEmail,
          name: dto.ownerName,
          passwordHash,
          role: UserRole.OWNER,
          firmId: createdFirm.id,
          isActive: true,
          // The owner receives a provisioned password and must replace it.
          mustChangePassword: true
        },
        select: { name: true, email: true }
      });
      return { firm: createdFirm, user: createdUser };
    });

    return toEntity(FirmEntity, {
      id: firm.id,
      name: firm.name,
      createdAt: firm.createdAt,
      ownerName: user.name,
      ownerEmail: user.email
    });
  }

  /**
   * Manual user onboarding into a tenant firm by a SUPER_ADMIN. Delegates to
   * UsersService (the single owner of firm-scoped accounts) so the create,
   * duplicate-email and first-login rules stay in one place.
   */
  async createUser(
    firmId: string,
    dto: CreatePlatformUserDto
  ): Promise<UserEntity> {
    await this.requireFirm(firmId);
    return this.usersService.createPlatformUser(firmId, dto);
  }

  /** Members of a firm for the platform page, newest first. */
  async findUsers(firmId: string): Promise<UserEntity[]> {
    await this.requireFirm(firmId);
    return this.usersService.findAll(firmId);
  }

  private async requireFirm(firmId: string): Promise<void> {
    const firm = await this.prisma.firm.findUnique({
      where: { id: firmId },
      select: { id: true }
    });
    if (!firm) {
      throw new NotFoundException("Firm not found");
    }
  }
}
