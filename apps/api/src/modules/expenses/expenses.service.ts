import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { toEntities, toEntity } from "../../common/serialization/serialize";
import {
  BillingCycle,
  ExpenseType,
  Prisma
} from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { JwtPayload } from "../auth/strategies/access-token.strategy";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { CreateRecurringTemplateDto } from "./recurring-expenses/dto/create-recurring-template.dto";
import { ExpenseEntity } from "./entities/expense.entity";
import { RecurringTemplateEntity } from "./entities/recurring-template.entity";

const ASSOCIATE_INCLUDE = {
  associate: { select: { id: true, fullName: true, email: true } }
} as const;

function parseDateOnly(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid date: ${value}`);
  }
  return date;
}

function nextRunFrom(from: Date, cycle: BillingCycle): Date {
  const next = new Date(from);
  if (cycle === BillingCycle.MONTHLY) {
    next.setUTCMonth(next.getUTCMonth() + 1);
  } else if (cycle === BillingCycle.QUARTERLY) {
    next.setUTCMonth(next.getUTCMonth() + 3);
  } else {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  }
  return next;
}

/**
 * Single firm-scoped source of truth for both FIXED and MANUAL expenses plus
 * the recurring templates that generate them. Every method resolves the firm
 * from the caller's JWT, so no expense can leak across tenants.
 */
@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  private requireFirm(user: JwtPayload): string {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return user.firmId;
  }

  async createExpense(
    user: JwtPayload,
    type: ExpenseType,
    dto: CreateExpenseDto
  ): Promise<ExpenseEntity> {
    const firmId = this.requireFirm(user);
    const expense = await this.prisma.expense.create({
      data: {
        firmId,
        type,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        date: parseDateOnly(dto.date),
        vendor: dto.vendor ?? null,
        paymentMethod: dto.paymentMethod ?? null,
        receiptUrl: dto.receiptUrl ?? null,
        associateId: dto.associateId ?? null,
        loggedById: user.sub
      },
      include: ASSOCIATE_INCLUDE
    });
    return toEntity(ExpenseEntity, expense);
  }

  async findAllForFirm(user: JwtPayload): Promise<ExpenseEntity[]> {
    const firmId = this.requireFirm(user);
    const expenses = await this.prisma.expense.findMany({
      where: { firmId },
      include: ASSOCIATE_INCLUDE,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }]
    });
    return toEntities(ExpenseEntity, expenses);
  }

  async findOneForFirm(user: JwtPayload, id: string): Promise<ExpenseEntity> {
    const firmId = this.requireFirm(user);
    const expense = await this.prisma.expense.findFirst({
      where: { id, firmId },
      include: ASSOCIATE_INCLUDE
    });
    if (!expense) {
      throw new NotFoundException("Expense not found");
    }
    return toEntity(ExpenseEntity, expense);
  }

  async updateExpense(
    user: JwtPayload,
    id: string,
    dto: Partial<CreateExpenseDto>
  ): Promise<ExpenseEntity> {
    const firmId = this.requireFirm(user);
    const existing = await this.prisma.expense.findFirst({
      where: { id, firmId },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException("Expense not found");
    }

    const data: Prisma.ExpenseUncheckedUpdateInput = {};
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.date !== undefined) data.date = parseDateOnly(dto.date);
    if (dto.vendor !== undefined) data.vendor = dto.vendor;
    if (dto.paymentMethod !== undefined) data.paymentMethod = dto.paymentMethod;
    if (dto.receiptUrl !== undefined) data.receiptUrl = dto.receiptUrl;
    if (dto.associateId !== undefined) data.associateId = dto.associateId;

    const updated = await this.prisma.expense.update({
      where: { id },
      data,
      include: ASSOCIATE_INCLUDE
    });
    return toEntity(ExpenseEntity, updated);
  }

  async removeExpense(user: JwtPayload, id: string): Promise<void> {
    const firmId = this.requireFirm(user);
    const existing = await this.prisma.expense.findFirst({
      where: { id, firmId },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException("Expense not found");
    }
    await this.prisma.expense.delete({ where: { id } });
  }

  // ==========================================
  // Recurring templates
  // ==========================================

  /** Lists templates, generating any that are due first (lazy). */
  async listTemplates(user: JwtPayload): Promise<RecurringTemplateEntity[]> {
    await this.runGeneration(user);
    const firmId = this.requireFirm(user);
    const templates = await this.prisma.recurringExpenseTemplate.findMany({
      where: { firmId },
      orderBy: { createdAt: "asc" }
    });
    return toEntities(RecurringTemplateEntity, templates);
  }

  async createTemplate(
    user: JwtPayload,
    dto: CreateRecurringTemplateDto
  ): Promise<RecurringTemplateEntity> {
    const firmId = this.requireFirm(user);
    const base = dto.nextRunDate
      ? parseDateOnly(dto.nextRunDate)
      : nextRunFrom(new Date(), dto.billingCycle);
    const template = await this.prisma.recurringExpenseTemplate.create({
      data: {
        firmId,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        billingCycle: dto.billingCycle,
        nextRunDate: base
      }
    });
    return toEntity(RecurringTemplateEntity, template);
  }

  async updateTemplate(
    user: JwtPayload,
    id: string,
    dto: Partial<CreateRecurringTemplateDto> & { isActive?: boolean }
  ): Promise<RecurringTemplateEntity> {
    const firmId = this.requireFirm(user);
    const existing = await this.prisma.recurringExpenseTemplate.findFirst({
      where: { id, firmId },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException("Recurring template not found");
    }

    const data: Prisma.RecurringExpenseTemplateUpdateInput = {};
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.billingCycle !== undefined) data.billingCycle = dto.billingCycle;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.nextRunDate !== undefined) {
      data.nextRunDate = parseDateOnly(dto.nextRunDate);
    }

    const updated = await this.prisma.recurringExpenseTemplate.update({
      where: { id },
      data
    });
    return toEntity(RecurringTemplateEntity, updated);
  }

  async removeTemplate(user: JwtPayload, id: string): Promise<void> {
    const firmId = this.requireFirm(user);
    const existing = await this.prisma.recurringExpenseTemplate.findFirst({
      where: { id, firmId },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException("Recurring template not found");
    }
    await this.prisma.recurringExpenseTemplate.delete({ where: { id } });
  }

  /**
   * Materializes every due active template into a FIXED expense and advances
   * its `nextRunDate` by one billing cycle. Returns how many were generated.
   */
  async runGeneration(user: JwtPayload): Promise<number> {
    const firmId = this.requireFirm(user);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const due = await this.prisma.recurringExpenseTemplate.findMany({
      where: { firmId, isActive: true, nextRunDate: { lte: today } }
    });

    let created = 0;
    for (const template of due) {
      await this.prisma.expense.create({
        data: {
          firmId,
          type: ExpenseType.FIXED,
          category: template.category,
          description: template.description,
          amount: template.amount,
          date: today,
          isAutoGenerated: true,
          loggedById: user.sub
        }
      });
      await this.prisma.recurringExpenseTemplate.update({
        where: { id: template.id },
        data: { nextRunDate: nextRunFrom(today, template.billingCycle) }
      });
      created += 1;
    }
    return created;
  }
}
