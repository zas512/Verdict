import {
  Matches,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength
} from "class-validator";

export class CreateLeaveDto {
  @IsUUID()
  leaveTypeId!: string;

  /** Calendar day, `YYYY-MM-DD`. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "startDate must be YYYY-MM-DD" })
  startDate!: string;

  /** Calendar day, `YYYY-MM-DD`. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "endDate must be YYYY-MM-DD" })
  endDate!: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  reason?: string;
}
