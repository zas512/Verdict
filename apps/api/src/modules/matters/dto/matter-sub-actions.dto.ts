import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean
} from "class-validator";
import { PartyRole } from "../../../generated/prisma/enums";

export class AssignAssociateDto {
  @IsUUID()
  @IsNotEmpty()
  associateId!: string;

  @IsString()
  @IsOptional()
  role?: string;
}

export class AddPartyDto {
  @IsUUID()
  @IsOptional()
  partyId?: string;

  @IsEnum(PartyRole)
  partyRole!: PartyRole;

  // Fields to create a new party inline if partyId is not provided
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  isExternal?: boolean;
}

export class ChangeStageDto {
  @IsUUID()
  @IsNotEmpty()
  currentStageId!: string;
}

export class ChangeStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string;
}
