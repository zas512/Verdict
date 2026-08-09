import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import { LeadStatus, UserRole } from "../../../generated/prisma/enums";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import type { JwtPayload } from "../../auth/strategies/access-token.strategy";
import { ConvertLeadDto } from "./dto/convert-lead.dto";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { LeadEntity } from "./entities/lead.entity";
import { LeadsService } from "./leads.service";

@Controller("leads")
@Roles(UserRole.OWNER, UserRole.ASSOCIATE)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  async create(
    @CurrentUser("firmId") firmId: string | null,
    @Body() dto: CreateLeadDto
  ): Promise<LeadEntity> {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.leadsService.create(firmId, dto);
  }

  @Get()
  async findAll(
    @CurrentUser("firmId") firmId: string | null,
    @Query("status") status?: string
  ): Promise<LeadEntity[]> {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    let leadStatus: LeadStatus | undefined;
    if (status) {
      leadStatus = status.toUpperCase() as LeadStatus;
      if (!Object.values(LeadStatus).includes(leadStatus)) {
        throw new BadRequestException(`Invalid lead status: ${status}`);
      }
    }
    return this.leadsService.findAll(firmId, leadStatus);
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("firmId") firmId: string | null
  ): Promise<LeadEntity> {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.leadsService.findOne(firmId, id);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("firmId") firmId: string | null,
    @Body() dto: UpdateLeadDto
  ): Promise<LeadEntity> {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.leadsService.update(firmId, id, dto);
  }

  @Post(":id/convert")
  @Roles(UserRole.OWNER)
  async convert(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConvertLeadDto
  ): Promise<LeadEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.leadsService.convert(user.firmId, id, user.sub, dto);
  }
}
