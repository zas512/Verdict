import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString
} from "class-validator";
import { ClientStatus, ClientType } from "../../../generated/prisma/enums";

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(ClientType)
  @IsOptional()
  clientType?: ClientType;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  cnic?: string;

  @IsString()
  @IsOptional()
  companyRegistration?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(ClientStatus)
  @IsOptional()
  status?: ClientStatus;
}
