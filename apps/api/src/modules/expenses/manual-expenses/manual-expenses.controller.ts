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
import { Roles } from "../../auth/decorators/roles.decorator";
import type { JwtPayload } from "../../auth/strategies/access-token.strategy";
import { ExpenseEntity } from "../entities/expense.entity";
import { CreateManualExpenseDto } from "./dto/create-manual-expense.dto";
import { UpdateManualExpenseDto } from "./dto/update-manual-expense.dto";
import { ManualExpensesService } from "./manual-expenses.service";

@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller("manual-expenses")
export class ManualExpensesController {
  constructor(private readonly manualExpensesService: ManualExpensesService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateManualExpenseDto
  ): Promise<ExpenseEntity> {
    return this.manualExpensesService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload): Promise<ExpenseEntity[]> {
    return this.manualExpensesService.findAll(user);
  }

  @Get(":id")
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<ExpenseEntity> {
    return this.manualExpensesService.findOne(user, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateManualExpenseDto
  ): Promise<ExpenseEntity> {
    return this.manualExpensesService.update(user, id, dto);
  }

  @Delete(":id")
  remove(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<void> {
    return this.manualExpensesService.remove(user, id);
  }
}
