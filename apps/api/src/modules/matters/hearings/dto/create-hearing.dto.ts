import { IsEnum, IsNotEmpty, IsOptional, IsString, IsISO8601, IsArray, IsUUID } from "class-validator";
import { HearingStatus } from "../../../../generated/prisma/enums";

export class CreateHearingDto {
  @IsISO8601()
  @IsNotEmpty()
  hearingDate!: string;

  @IsString()
  @IsNotEmpty()
  purpose!: string;

  @IsString()
  @IsOptional()
  presidingJudge?: string;

  @IsString()
  @IsOptional()
  proceedingsSummary?: string;

  @IsString()
  @IsOptional()
  orderSheetUrl?: string;

  @IsISO8601()
  @IsOptional()
  nextDate?: string;

  @IsString()
  @IsOptional()
  nextPurpose?: string;

  @IsEnum(HearingStatus)
  @IsOptional()
  status?: HearingStatus;

  @IsArray()
  @IsUUID("all", { each: true })
  @IsOptional()
  attendeeAssociateIds?: string[];
}
