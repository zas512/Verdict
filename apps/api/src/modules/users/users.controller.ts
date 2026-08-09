import { Body, Controller, Get, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../../generated/prisma/enums";
import { CreateFirmMemberDto } from "./dto/firm-member.dto";
import { UserEntity } from "./entities/user.entity";
import { UsersService } from "./users.service";

/**
 * Authentication is applied by the global AccessTokenGuard/RolesGuard pair, so
 * only the `@Roles()` requirement is declared here.
 */
@Controller("users")
@Roles(UserRole.OWNER)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  createTeamMember(
    @CurrentUser("firmId") firmId: string | null,
    @Body() dto: CreateFirmMemberDto
  ): Promise<UserEntity> {
    return this.usersService.create(firmId, dto);
  }

  @Get()
  getTeamMembers(
    @CurrentUser("firmId") firmId: string | null
  ): Promise<UserEntity[]> {
    return this.usersService.findAll(firmId);
  }
}
