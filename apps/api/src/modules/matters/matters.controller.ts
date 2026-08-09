import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  ForbiddenException
} from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { JwtPayload } from "../auth/strategies/access-token.strategy";
import { UserRole } from "../../generated/prisma/enums";
import { CreateMatterDto } from "./dto/create-matter.dto";
import { UpdateMatterDto } from "./dto/update-matter.dto";
import {
  AssignAssociateDto,
  AddPartyDto,
  ChangeStageDto,
  ChangeStatusDto
} from "./dto/matter-sub-actions.dto";
import { MattersService } from "./matters.service";
import { MatterEntity } from "./entities/matter.entity";
import { UsersService } from "../users/users.service";

@Controller("matters")
@Roles(UserRole.OWNER, UserRole.ASSOCIATE)
export class MattersController {
  constructor(
    private readonly mattersService: MattersService,
    private readonly usersService: UsersService
  ) {}

  @Post()
  @Roles(UserRole.OWNER)
  async create(
    @CurrentUser("firmId") firmId: string | null,
    @Body() dto: CreateMatterDto
  ): Promise<MatterEntity> {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.mattersService.create(firmId, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: JwtPayload): Promise<MatterEntity[]> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    let associateId: string | undefined;
    if (user.role === UserRole.ASSOCIATE) {
      associateId = await this.usersService.resolveAssociateId(user.sub);
    }
    return this.mattersService.findAll(user.firmId, user.role, associateId);
  }

  @Get("stages")
  async getStages(@CurrentUser() user: JwtPayload) {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.mattersService.findStages(user.firmId);
  }

  @Get("parties")
  async getParties(@CurrentUser() user: JwtPayload) {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.mattersService.findParties(user.firmId);
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<MatterEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    let associateId: string | undefined;
    if (user.role === UserRole.ASSOCIATE) {
      associateId = await this.usersService.resolveAssociateId(user.sub);
    }
    return this.mattersService.findOne(id, user.firmId, user.role, associateId);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("firmId") firmId: string | null,
    @Body() dto: UpdateMatterDto
  ): Promise<MatterEntity> {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.mattersService.update(id, firmId, dto);
  }

  @Patch(":id/stage")
  @Roles(UserRole.OWNER)
  async changeStage(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangeStageDto
  ): Promise<MatterEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.mattersService.changeStage(id, user.firmId, dto, user.sub);
  }

  @Patch(":id/status")
  @Roles(UserRole.OWNER)
  async changeStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangeStatusDto
  ): Promise<MatterEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.mattersService.changeStatus(id, user.firmId, dto, user.sub);
  }

  @Post(":id/associates")
  @Roles(UserRole.OWNER)
  async assignAssociate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("firmId") firmId: string | null,
    @Body() dto: AssignAssociateDto
  ): Promise<MatterEntity> {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.mattersService.assignAssociate(id, firmId, dto);
  }

  @Delete(":id/associates/:associateId")
  @Roles(UserRole.OWNER)
  async removeAssociate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("firmId") firmId: string | null,
    @Param("associateId", ParseUUIDPipe) associateId: string
  ): Promise<MatterEntity> {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.mattersService.removeAssociate(id, firmId, associateId);
  }

  @Post(":id/parties")
  @Roles(UserRole.OWNER)
  async addParty(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("firmId") firmId: string | null,
    @Body() dto: AddPartyDto
  ): Promise<MatterEntity> {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.mattersService.addParty(id, firmId, dto);
  }

  @Get(":id/timeline")
  async getTimeline(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload
  ) {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    let associateId: string | undefined;
    if (user.role === UserRole.ASSOCIATE) {
      associateId = await this.usersService.resolveAssociateId(user.sub);
    }
    return this.mattersService.getTimeline(
      id,
      user.firmId,
      user.role,
      associateId
    );
  }

  @Get(":id/summary-report")
  @Roles(UserRole.OWNER)
  async getSummaryReport(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("firmId") firmId: string | null,
    @Res() res: Response
  ) {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    const pdfBuffer = await this.mattersService.generateSummaryReport(
      id,
      firmId
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=matter-${id}-summary.pdf`,
      "Content-Length": pdfBuffer.length
    });
    res.send(pdfBuffer);
  }
}
