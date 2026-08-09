import { Expose, Type } from "class-transformer";
import type { BillingCycle } from "../../../generated/prisma/enums";

export class RecurringTemplateEntity {
  @Expose()
  id!: string;

  @Expose()
  category!: string;

  @Expose()
  description!: string;

  @Expose()
  @Type(() => Number)
  amount!: number;

  @Expose()
  billingCycle!: BillingCycle;

  @Expose()
  isActive!: boolean;

  @Expose()
  nextRunDate!: Date;

  @Expose()
  createdAt!: Date;
}
