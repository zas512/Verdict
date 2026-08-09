import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID
} from "class-validator";
import {
  CaseType,
  LeadSource,
  LeadStatus
} from "../../../../generated/prisma/enums";

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  cnic?: string;

  @IsEnum(CaseType)
  @IsOptional()
  practiceArea?: CaseType;

  @IsEnum(LeadSource)
  @IsOptional()
  source?: LeadSource;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;
}
