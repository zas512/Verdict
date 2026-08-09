import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { toEntities, toEntity } from "../../../common/serialization/serialize";
import {
  LeaveRequestStatus,
  UserRole
} from "../../../generated/prisma/enums";
import { PrismaService } from "../../../prisma/prisma.service";
import type { JwtPayload } from "../../auth/strategies/access-token.strategy";
import { UsersService } from "../../users/users.service";
import { CreateLeaveDto } from "./dto/create-leave.dto";
import { UpdateLeaveStatusDto } from "./dto/update-leave.dto";
import {
  LeaveBalanceEntity,
  LeaveRequestEntity,
  LeaveTypeEntity
} from "./entities/leave.entity";

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

const DAY_MS = 86_400_000;

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService
  ) {}

  private requireFirm(user: JwtPayload): string {
    if (!user.firmId) {
      throw new BadRequestException("User must belong to a firm");
    }
    return user.firmId;
  }

  private resolveAssociateId(user: JwtPayload): Promise<string> {
    return this.users.resolveAssociateId(user.sub);
  }

  async create(
    user: JwtPayload,
    dto: CreateLeaveDto
  ): Promise<LeaveRequestEntity> {
    const firmId = this.requireFirm(user);
    const associateId = await this.resolveAssociateId(user);

    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: dto.leaveTypeId, firmId }
    });
    if (!leaveType) {
      throw new NotFoundException("Leave type not found in this firm");
    }

    const start = parseDateOnly(dto.startDate);
    const end = parseDateOnly(dto.endDate);
    if (end < start) {
      throw new BadRequestException("endDate must be on or after startDate");
    }

    const request = await this.prisma.leaveRequest.create({
      data: {
        associateId,
        leaveTypeId: dto.leaveTypeId,
        startDate: start,
        endDate: end,
        reason: dto.reason ?? null
      },
      include: { leaveType: { select: { id: true, name: true } } }
    });

    return toEntity(LeaveRequestEntity, request);
  }

  async findAll(user: JwtPayload): Promise<LeaveRequestEntity[]> {
    const firmId = this.requireFirm(user);
    const where =
      user.role === UserRole.ASSOCIATE
        ? { associateId: await this.resolveAssociateId(user) }
        : { leaveType: { firmId } };

    const requests = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: { select: { id: true, name: true } },
        associate: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return toEntities(LeaveRequestEntity, requests);
  }

  async findTypes(user: JwtPayload): Promise<LeaveTypeEntity[]> {
    const firmId = this.requireFirm(user);
    const types = await this.prisma.leaveType.findMany({
      where: { firmId },
      orderBy: { name: "asc" }
    });

    return toEntities(LeaveTypeEntity, types);
  }

  async findBalances(user: JwtPayload): Promise<LeaveBalanceEntity[]> {
    const firmId = this.requireFirm(user);
    const where =
      user.role === UserRole.ASSOCIATE
        ? { associateId: await this.resolveAssociateId(user) }
        : { leaveType: { firmId } };

    const balances = await this.prisma.leaveBalance.findMany({
      where,
      include: { leaveType: { select: { id: true, name: true } } },
      orderBy: { leaveType: { name: "asc" } }
    });

    return toEntities(LeaveBalanceEntity, balances);
  }

  async updateStatus(
    user: JwtPayload,
    id: string,
    dto: UpdateLeaveStatusDto
  ): Promise<LeaveRequestEntity> {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException(
        "Only the firm owner can approve or reject leave"
      );
    }
    const firmId = this.requireFirm(user);

    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, leaveType: { firmId } },
      include: { leaveType: true }
    });
    if (!request) {
      throw new NotFoundException("Leave request not found");
    }
    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException("Only pending requests can be decided");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.status === LeaveRequestStatus.APPROVED) {
        const year = request.startDate.getUTCFullYear();
        const days =
          Math.round(
            (request.endDate.getTime() - request.startDate.getTime()) / DAY_MS
          ) + 1;

        const balance = await tx.leaveBalance.upsert({
          where: {
            associateId_leaveTypeId_year: {
              associateId: request.associateId,
              leaveTypeId: request.leaveTypeId,
              year
            }
          },
          update: {},
          create: {
            associateId: request.associateId,
            leaveTypeId: request.leaveTypeId,
            year,
            allotted: request.leaveType.annualAllotment,
            used: 0
          }
        });
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { used: balance.used + days }
        });
      }

      return tx.leaveRequest.update({
        where: { id },
        data: {
          status: dto.status,
          approverId: user.sub,
          decidedAt: new Date()
        },
        include: { leaveType: { select: { id: true, name: true } } }
      });
    });

    return toEntity(LeaveRequestEntity, updated);
  }
}
