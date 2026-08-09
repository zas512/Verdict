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
import { CreateFixedExpenseDto } from "./dto/create-fixed-expense.dto";
import { UpdateFixedExpenseDto } from "./dto/update-fixed-expense.dto";
import { FixedExpensesService } from "./fixed-expenses.service";

@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller("fixed-expenses")
export class FixedExpensesController {
  constructor(private readonly fixedExpensesService: FixedExpensesService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFixedExpenseDto
  ): Promise<ExpenseEntity> {
    return this.fixedExpensesService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload): Promise<ExpenseEntity[]> {
    return this.fixedExpensesService.findAll(user);
  }

  @Get(":id")
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<ExpenseEntity> {
    return this.fixedExpensesService.findOne(user, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateFixedExpenseDto
  ): Promise<ExpenseEntity> {
    return this.fixedExpensesService.update(user, id, dto);
  }

  @Delete(":id")
  remove(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<void> {
    return this.fixedExpensesService.remove(user, id);
  }
}
