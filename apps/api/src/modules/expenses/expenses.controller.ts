import { Controller, Get } from "@nestjs/common";
import { UserRole } from "../../generated/prisma/enums";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { JwtPayload } from "../auth/strategies/access-token.strategy";
import { ExpenseEntity } from "./entities/expense.entity";
import { ExpensesService } from "./expenses.service";

/**
 * Unified firm expense ledger across FIXED and MANUAL types. The dashboard
 * and the `/expenses` page both consume this.
 */
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload): Promise<ExpenseEntity[]> {
    return this.expensesService.findAllForFirm(user);
  }
}
