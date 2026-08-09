import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  IsISO8601
} from "class-validator";
import { CaseType } from "../../../generated/prisma/enums";

export class CreateMatterDto {
  @IsString()
  @IsNotEmpty()
  firmCaseNumber!: string;

  @IsString()
  @IsOptional()
  courtCaseNumber?: string;

  @IsString()
  @IsOptional()
  cnr?: string;

  @IsEnum(CaseType)
  caseType!: CaseType;

  @IsString()
  @IsOptional()
  court?: string;

  @IsString()
  @IsOptional()
  bench?: string;

  @IsString()
  @IsOptional()
  presidingJudge?: string;

  @IsString()
  @IsOptional()
  currentStageId?: string;

  @IsISO8601()
  @IsOptional()
  filingDate?: string;

  @IsString()
  @IsNotEmpty()
  clientName!: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsArray()
  @IsUUID("all", { each: true })
  @IsOptional()
  associateIds?: string[];
}
