import {
  Body,
  Controller,
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
import { CreateLeaveDto } from "./dto/create-leave.dto";
import { UpdateLeaveStatusDto } from "./dto/update-leave.dto";
import {
  LeaveBalanceEntity,
  LeaveRequestEntity,
  LeaveTypeEntity
} from "./entities/leave.entity";
import { LeaveService } from "./leave.service";

/**
 * Associates apply for and track their own leave; the owner sees every firm
 * request and is the only role that can approve or reject. ADMIN/SUPER_ADMIN
 * have no access here.
 */
@Controller("leave")
@Roles(UserRole.OWNER, UserRole.ASSOCIATE)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLeaveDto
  ): Promise<LeaveRequestEntity> {
    return this.leaveService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload): Promise<LeaveRequestEntity[]> {
    return this.leaveService.findAll(user);
  }

  @Get("types")
  findTypes(@CurrentUser() user: JwtPayload): Promise<LeaveTypeEntity[]> {
    return this.leaveService.findTypes(user);
  }

  @Get("balances")
  findBalances(@CurrentUser() user: JwtPayload): Promise<LeaveBalanceEntity[]> {
    return this.leaveService.findBalances(user);
  }

  @Patch(":id/status")
  @Roles(UserRole.OWNER)
  updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateLeaveStatusDto
  ): Promise<LeaveRequestEntity> {
    return this.leaveService.updateStatus(user, id, dto);
  }
}
