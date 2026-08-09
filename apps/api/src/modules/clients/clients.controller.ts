import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post
} from "@nestjs/common";
import { UserRole } from "../../generated/prisma/enums";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { JwtPayload } from "../auth/strategies/access-token.strategy";
import { UsersService } from "../users/users.service";
import { ClientsService } from "./clients.service";
import { ConflictCheckDto } from "./dto/conflict-check.dto";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { ClientEntity } from "./entities/client.entity";

@Controller("clients")
@Roles(UserRole.OWNER, UserRole.ASSOCIATE)
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly usersService: UsersService
  ) {}

  @Post()
  @Roles(UserRole.OWNER)
  async create(
    @CurrentUser("firmId") firmId: string | null,
    @Body() dto: CreateClientDto
  ): Promise<ClientEntity> {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.clientsService.create(firmId, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: JwtPayload): Promise<ClientEntity[]> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    let associateId: string | undefined;
    if (user.role === UserRole.ASSOCIATE) {
      associateId = await this.usersService.resolveAssociateId(user.sub);
    }
    return this.clientsService.findAll(user.firmId, user.role, associateId);
  }

  @Post("conflict-check")
  @Roles(UserRole.OWNER)
  async checkConflict(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConflictCheckDto
  ) {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.clientsService.checkConflict(user.firmId, user.sub, dto);
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<ClientEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    let associateId: string | undefined;
    if (user.role === UserRole.ASSOCIATE) {
      associateId = await this.usersService.resolveAssociateId(user.sub);
    }
    return this.clientsService.findOne(id, user.firmId, user.role, associateId);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("firmId") firmId: string | null,
    @Body() dto: UpdateClientDto
  ): Promise<ClientEntity> {
    if (!firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.clientsService.update(id, firmId, dto);
  }
}
