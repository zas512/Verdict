import { PartialType } from "@nestjs/mapped-types";
import { CreateManualExpenseDto } from "./create-manual-expense.dto";

export class UpdateManualExpenseDto extends PartialType(
  CreateManualExpenseDto
) {}
