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
import { UserRole } from "../../../generated/prisma/enums";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Permissions } from "../../auth/decorators/permissions.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import type { JwtPayload } from "../../auth/strategies/access-token.strategy";
import { RecurringTemplateEntity } from "../entities/recurring-template.entity";
import { ExpensesService } from "../expenses.service";
import { CreateRecurringTemplateDto } from "./dto/create-recurring-template.dto";
import { UpdateRecurringTemplateDto } from "./dto/update-recurring-template.dto";

@Roles(UserRole.OWNER, UserRole.ADMIN)
@Permissions("finance.read")
@Controller("recurring-expenses")
export class RecurringExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload): Promise<RecurringTemplateEntity[]> {
    return this.expensesService.listTemplates(user);
  }

  @Permissions("finance.read", "finance.post")
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRecurringTemplateDto
  ): Promise<RecurringTemplateEntity> {
    return this.expensesService.createTemplate(user, dto);
  }

  /** Materializes due templates now and returns how many were generated. */
  @Permissions("finance.read", "finance.post")
  @Post("run")
  async run(@CurrentUser() user: JwtPayload): Promise<{ generated: number }> {
    const generated = await this.expensesService.runGeneration(user);
    return { generated };
  }

  @Permissions("finance.read", "finance.post")
  @Patch(":id")
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurringTemplateDto
  ): Promise<RecurringTemplateEntity> {
    return this.expensesService.updateTemplate(user, id, dto);
  }

  @Permissions("finance.read", "finance.post")
  @Delete(":id")
  remove(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<void> {
    return this.expensesService.removeTemplate(user, id);
  }
}
