import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { LeaveRequestStatus } from "../../../../generated/prisma/enums";

/** Decision on a pending leave request — only the firm owner may pass it. */
export class UpdateLeaveStatusDto {
  @IsEnum(LeaveRequestStatus)
  status!: LeaveRequestStatus;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  reason?: string;
}
