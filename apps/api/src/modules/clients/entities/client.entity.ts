import { Expose, Type } from "class-transformer";
import { ClientStatus, ClientType } from "../../../generated/prisma/enums";

export class MatterSummaryEntity {
  @Expose()
  id!: string;

  @Expose()
  firmCaseNumber!: string;

  @Expose()
  courtCaseNumber?: string | null;

  @Expose()
  caseType!: string;

  @Expose()
  status!: string;

  @Expose()
  filingDate?: Date | null;

  @Expose()
  clientName!: string;
}

export class ClientEntity {
  @Expose()
  id!: string;

  @Expose()
  firmId!: string;

  @Expose()
  name!: string;

  @Expose()
  clientType!: ClientType;

  @Expose()
  contactPerson?: string | null;

  @Expose()
  cnic?: string | null;

  @Expose()
  companyRegistration?: string | null;

  @Expose()
  phone?: string | null;

  @Expose()
  email?: string | null;

  @Expose()
  address?: string | null;

  @Expose()
  notes?: string | null;

  @Expose()
  status!: ClientStatus;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => MatterSummaryEntity)
  matters?: MatterSummaryEntity[];
}
