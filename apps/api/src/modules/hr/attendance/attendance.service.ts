import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { toEntities, toEntity } from "../../../common/serialization/serialize";
import type { Prisma } from "../../../generated/prisma/client";
import {
  AttendanceSource,
  AttendanceStatus
} from "../../../generated/prisma/enums";
import { PrismaService } from "../../../prisma/prisma.service";
import type { JwtPayload } from "../../auth/strategies/access-token.strategy";
import { UsersService } from "../../users/users.service";
import { CheckInDto, CreateAttendanceDto } from "./dto/create-attendance.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";
import { AttendanceEntity } from "./entities/attendance.entity";

const HALF_DAY_THRESHOLD_HOURS = 4;

function toDateOnly(value: Date): Date {
  return new Date(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
  );
}

function parseDateOnly(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid date: ${value}`);
  }
  return date;
}

function statusForShift(
  checkIn: Date | null,
  checkOut: Date | null
): AttendanceStatus | null {
  if (!checkIn || !checkOut) {
    return null;
  }
  const hours = (checkOut.getTime() - checkIn.getTime()) / 3_600_000;
  return hours < HALF_DAY_THRESHOLD_HOURS
    ? AttendanceStatus.HALF_DAY
    : AttendanceStatus.PRESENT;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService
  ) {}

  async findAllForUser(user: JwtPayload): Promise<AttendanceEntity[]> {
    const associateId = await this.users.resolveAssociateId(user.sub);
    const records = await this.prisma.attendance.findMany({
      where: { associateId },
      orderBy: [{ date: "desc" }, { checkIn: "desc" }]
    });
    return toEntities(AttendanceEntity, records);
  }

  async findAllForFirm(user: JwtPayload): Promise<AttendanceEntity[]> {
    if (user.role !== "OWNER") {
      throw new BadRequestException(
        "Only the owner can view firm-wide attendance."
      );
    }
    if (!user.firmId) {
      return [];
    }
    const records = await this.prisma.attendance.findMany({
      where: {
        associate: {
          firmId: user.firmId
        }
      },
      include: {
        associate: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: [{ date: "desc" }, { checkIn: "desc" }]
    });
    return toEntities(AttendanceEntity, records);
  }

  async checkIn(user: JwtPayload, dto: CheckInDto): Promise<AttendanceEntity> {
    const associateId = await this.users.resolveAssociateId(user.sub);
    const now = new Date();
    const date = dto.clientDate
      ? parseDateOnly(dto.clientDate)
      : toDateOnly(now);

    // Look for any open shift for this associate (checkOut is null)
    const openShift = await this.prisma.attendance.findFirst({
      where: { associateId, checkOut: null }
    });

    if (openShift) {
      throw new BadRequestException("You are already checked in!");
    }

    const record = await this.prisma.attendance.create({
      data: {
        associateId,
        date,
        checkIn: now,
        checkOut: null,
        status: AttendanceStatus.PRESENT,
        source: AttendanceSource.REMOTE_CHECKIN,
        notes: dto.notes ?? "Web Portal Check-In"
      }
    });
    return toEntity(AttendanceEntity, record);
  }

  async checkOut(user: JwtPayload, dto: CheckInDto): Promise<AttendanceEntity> {
    const associateId = await this.users.resolveAssociateId(user.sub);

    const open = await this.prisma.attendance.findFirst({
      where: { associateId, checkOut: null },
      orderBy: { date: "desc" }
    });
    if (!open) {
      throw new BadRequestException("You are not checked in!");
    }

    const now = new Date();
    const record = await this.prisma.attendance.update({
      where: { id: open.id },
      data: {
        checkOut: now,
        status: statusForShift(open.checkIn, now) ?? open.status,
        notes: dto.notes
          ? `${open.notes ?? ""}\nCheckout: ${dto.notes}`.trim()
          : open.notes
      }
    });
    return toEntity(AttendanceEntity, record);
  }

  async createManual(
    user: JwtPayload,
    dto: CreateAttendanceDto
  ): Promise<AttendanceEntity> {
    const associateId = await this.users.resolveAssociateId(user.sub);
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkOut.getTime() < checkIn.getTime()) {
      throw new BadRequestException("checkOut must not precede checkIn");
    }

    const record = await this.prisma.attendance.create({
      data: {
        associateId,
        date: parseDateOnly(dto.date),
        checkIn,
        checkOut,
        status: dto.status,
        source: AttendanceSource.MANUAL_ADMIN,
        notes: dto.notes ?? "Manual Entry"
      }
    });
    return toEntity(AttendanceEntity, record);
  }

  async update(
    user: JwtPayload,
    id: string,
    dto: UpdateAttendanceDto
  ): Promise<AttendanceEntity> {
    const record = await this.findOwnRecord(user, id);

    const data: Prisma.AttendanceUpdateInput = {};
    if (dto.date) {
      data.date = parseDateOnly(dto.date);
    }
    if (dto.checkIn) {
      data.checkIn = new Date(dto.checkIn);
    }
    if (dto.checkOut !== undefined) {
      // An explicit null reopens the shift.
      data.checkOut = dto.checkOut === null ? null : new Date(dto.checkOut);
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    const checkIn = dto.checkIn ? new Date(dto.checkIn) : record.checkIn;
    const checkOut =
      dto.checkOut === undefined
        ? record.checkOut
        : dto.checkOut === null
          ? null
          : new Date(dto.checkOut);

    if (checkIn && checkOut && checkOut.getTime() < checkIn.getTime()) {
      throw new BadRequestException("checkOut must not precede checkIn");
    }

    // An explicit status wins; otherwise derive it from the resulting shift.
    data.status =
      dto.status ?? statusForShift(checkIn, checkOut) ?? record.status;

    const updated = await this.prisma.attendance.update({
      where: { id },
      data
    });
    return toEntity(AttendanceEntity, updated);
  }

  async remove(user: JwtPayload, id: string): Promise<AttendanceEntity> {
    await this.findOwnRecord(user, id);
    const deleted = await this.prisma.attendance.delete({ where: { id } });
    return toEntity(AttendanceEntity, deleted);
  }

  /**
   * Records are addressable by uuid, so every mutation re-checks that the row
   * belongs to the caller's associate before touching it.
   */
  private async findOwnRecord(user: JwtPayload, id: string) {
    const associateId = await this.users.resolveAssociateId(user.sub);
    const record = await this.prisma.attendance.findFirst({
      where: { id, associateId }
    });
    if (!record) {
      throw new NotFoundException("Attendance record not found");
    }
    return record;
  }
}
