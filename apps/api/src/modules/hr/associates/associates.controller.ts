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
import { UserRole } from "../../../generated/prisma/enums";
import {
  CreateFirmMemberDto,
  UpdateFirmMemberDto
} from "../../users/dto/firm-member.dto";
import type { UserEntity } from "../../users/entities/user.entity";
import { AssociatesService } from "./associates.service";

/**
 * Authentication comes from the global AccessTokenGuard; the class-level
 * `@Roles()` matches the web app, which already hides this area from
 * associates. Previously `findAll`/`findOne` carried no role requirement, so
 * any authenticated associate could read the firm's full roster and emails.
 */
@Controller("associates")
@Roles(UserRole.OWNER)
export class AssociatesController {
  constructor(private readonly associatesService: AssociatesService) {}

  @Post()
  create(
    @CurrentUser("firmId") firmId: string | null,
    @Body() dto: CreateFirmMemberDto
  ): Promise<UserEntity> {
    return this.associatesService.create(firmId, dto);
  }

  @Get()
  findAll(@CurrentUser("firmId") firmId: string | null): Promise<UserEntity[]> {
    return this.associatesService.findAll(firmId);
  }

  @Get(":id")
  findOne(
    @CurrentUser("firmId") firmId: string | null,
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<UserEntity> {
    return this.associatesService.findOne(firmId, id);
  }

  @Patch(":id")
  update(
    @CurrentUser("firmId") firmId: string | null,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateFirmMemberDto
  ): Promise<UserEntity> {
    return this.associatesService.update(firmId, id, dto);
  }
}
