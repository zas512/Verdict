import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../../generated/prisma/enums";
import { CreatePlatformUserDto } from "../users/dto/create-platform-user.dto";
import { UserEntity } from "../users/entities/user.entity";
import { CreateFirmDto } from "./dto/create-firm.dto";
import { FirmEntity } from "./entities/firm.entity";
import { FirmsService } from "./firms.service";

/** Platform administration; authentication comes from the global guards. */
@Controller("firms")
@Roles(UserRole.SUPER_ADMIN)
export class FirmsController {
  constructor(private readonly firmsService: FirmsService) {}

  @Get()
  findAll(): Promise<FirmEntity[]> {
    return this.firmsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateFirmDto): Promise<FirmEntity> {
    return this.firmsService.create(dto);
  }

  /** Manual user creation into a firm (mustChangePassword = first login). */
  @Post(":id/users")
  createUser(
    @Param("id") id: string,
    @Body() dto: CreatePlatformUserDto
  ): Promise<UserEntity> {
    return this.firmsService.createUser(id, dto);
  }

  @Get(":id/users")
  findUsers(@Param("id") id: string): Promise<UserEntity[]> {
    return this.firmsService.findUsers(id);
  }
}
