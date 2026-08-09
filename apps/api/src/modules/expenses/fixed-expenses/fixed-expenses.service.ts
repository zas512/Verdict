import { Injectable } from "@nestjs/common";
import { ExpenseType } from "../../../generated/prisma/enums";
import type { JwtPayload } from "../../auth/strategies/access-token.strategy";
import { ExpenseEntity } from "../entities/expense.entity";
import { ExpensesService } from "../expenses.service";
import { CreateFixedExpenseDto } from "./dto/create-fixed-expense.dto";
import { UpdateFixedExpenseDto } from "./dto/update-fixed-expense.dto";

/**
 * FIXED expenses delegate to the shared, firm-scoped ExpensesService.
 * Kept as its own provider so the two modules stay self-contained and the
 * routes remain `fixed-expenses/*`.
 */
@Injectable()
export class FixedExpensesService {
  constructor(private readonly expensesService: ExpensesService) {}

  create(user: JwtPayload, dto: CreateFixedExpenseDto): Promise<ExpenseEntity> {
    return this.expensesService.createExpense(user, ExpenseType.FIXED, dto);
  }

  findAll(user: JwtPayload): Promise<ExpenseEntity[]> {
    return this.expensesService.findAllForFirm(user);
  }

  findOne(user: JwtPayload, id: string): Promise<ExpenseEntity> {
    return this.expensesService.findOneForFirm(user, id);
  }

  update(
    user: JwtPayload,
    id: string,
    dto: UpdateFixedExpenseDto
  ): Promise<ExpenseEntity> {
    return this.expensesService.updateExpense(user, id, dto);
  }

  remove(user: JwtPayload, id: string): Promise<void> {
    return this.expensesService.removeExpense(user, id);
  }
}
