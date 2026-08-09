import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min
} from "class-validator";
import { BillingCycle } from "../../../../generated/prisma/enums";

export class CreateRecurringTemplateDto {
  @IsString()
  @MaxLength(100)
  category!: string;

  @IsString()
  @MaxLength(300)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  /** First run day, `YYYY-MM-DD`. Defaults to today when omitted. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "nextRunDate must be YYYY-MM-DD" })
  @IsOptional()
  nextRunDate?: string;
}
