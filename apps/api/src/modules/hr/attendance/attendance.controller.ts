import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post
} from "@nestjs/common";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import type { JwtPayload } from "../../auth/strategies/access-token.strategy";
import { UserRole } from "../../../generated/prisma/enums";
import { AttendanceService } from "./attendance.service";
import { CheckInDto, CreateAttendanceDto } from "./dto/create-attendance.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";
import { AttendanceEntity } from "./entities/attendance.entity";

/**
 * Own-record routes (list, check-in, check-out) are open to OWNER and
 * ASSOCIATE; firm-wide views and record corrections are OWNER-only.
 */
@Controller("attendance")
@Roles(UserRole.OWNER, UserRole.ASSOCIATE)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload): Promise<AttendanceEntity[]> {
    return this.attendanceService.findAllForUser(user);
  }

  @Get("firm")
  @Roles(UserRole.OWNER)
  findAllFirm(@CurrentUser() user: JwtPayload): Promise<AttendanceEntity[]> {
    return this.attendanceService.findAllForFirm(user);
  }

  @Post("check-in")
  checkIn(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CheckInDto
  ): Promise<AttendanceEntity> {
    return this.attendanceService.checkIn(user, dto);
  }

  @Post("check-out")
  checkOut(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CheckInDto
  ): Promise<AttendanceEntity> {
    return this.attendanceService.checkOut(user, dto);
  }

  @Post("manual")
  @Roles(UserRole.OWNER)
  createManual(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAttendanceDto
  ): Promise<AttendanceEntity> {
    return this.attendanceService.createManual(user, dto);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER)
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceDto
  ): Promise<AttendanceEntity> {
    return this.attendanceService.update(user, id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.OWNER)
  remove(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<AttendanceEntity> {
    return this.attendanceService.remove(user, id);
  }
}
