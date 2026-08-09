import { Expose, Type } from "class-transformer";
import { CaseType, LeadSource, LeadStatus } from "../../../../generated/prisma/enums";

export class AssociateSummaryEntity {
  @Expose()
  id!: string;

  @Expose()
  fullName!: string;

  @Expose()
  email?: string | null;

  @Expose()
  designation?: string | null;
}

export class ClientSummaryEntity {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  status!: string;
}

export class LeadEntity {
  @Expose()
  id!: string;

  @Expose()
  firmId!: string;

  @Expose()
  name!: string;

  @Expose()
  phone?: string | null;

  @Expose()
  email?: string | null;

  @Expose()
  cnic?: string | null;

  @Expose()
  practiceArea?: CaseType | null;

  @Expose()
  source!: LeadSource;

  @Expose()
  description?: string | null;

  @Expose()
  status!: LeadStatus;

  @Expose()
  assignedToId?: string | null;

  @Expose()
  convertedToClientId?: string | null;

  @Expose()
  convertedToMatterId?: string | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => AssociateSummaryEntity)
  assignedTo?: AssociateSummaryEntity | null;

  @Expose()
  @Type(() => ClientSummaryEntity)
  convertedToClient?: ClientSummaryEntity | null;
}
