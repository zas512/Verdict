import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  ForbiddenException
} from "@nestjs/common";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import type { JwtPayload } from "../../auth/strategies/access-token.strategy";
import { UserRole } from "../../../generated/prisma/enums";
import { CreateHearingDto } from "./dto/create-hearing.dto";
import { UpdateHearingDto } from "./dto/update-hearing.dto";
import { LogAttendeesDto } from "./dto/log-attendees.dto";
import { HearingsService } from "./hearings.service";
import { HearingEntity } from "./entities/hearing.entity";

@Controller()
@Roles(UserRole.OWNER, UserRole.ASSOCIATE)
export class HearingsController {
  constructor(private readonly hearingsService: HearingsService) {}

  @Post("matters/:matterId/hearings")
  async create(
    @Param("matterId", ParseUUIDPipe) matterId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateHearingDto
  ): Promise<HearingEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.hearingsService.create(matterId, user.firmId, user, dto);
  }

  @Get("matters/:matterId/hearings")
  async findAll(
    @Param("matterId", ParseUUIDPipe) matterId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<HearingEntity[]> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.hearingsService.findAll(matterId, user.firmId, user);
  }

  @Get("hearings/upcoming")
  async findUpcoming(
    @CurrentUser() user: JwtPayload
  ): Promise<HearingEntity[]> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.hearingsService.findUpcoming(user);
  }

  @Patch("hearings/:id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateHearingDto
  ): Promise<HearingEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.hearingsService.update(id, user.firmId, user, dto);
  }

  @Post("hearings/:id/attendees")
  @Roles(UserRole.OWNER)
  async logAttendees(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("firmId") firmId: string | null,
    @Body() dto: LogAttendeesDto
  ): Promise<HearingEntity> {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.hearingsService.logAttendees(id, firmId, dto);
  }
}
