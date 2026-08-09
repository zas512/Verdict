import { Expose, Type } from "class-transformer";
import { CaseType, MatterStatus } from "../../../generated/prisma/enums";

export class CourtStageSummaryEntity {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  sequenceOrder!: number;
}

export class MatterAssociateEntity {
  @Expose()
  id!: string;

  @Expose()
  associateId!: string;

  @Expose()
  role?: string;
}

export class MatterPartyEntity {
  @Expose()
  id!: string;

  @Expose()
  partyId!: string;

  @Expose()
  partyRole!: string;
}

export class ClientSummaryEntity {
  @Expose()
  id!: string;

  @Expose()
  name!: string;
}

export class MatterEntity {
  @Expose()
  id!: string;

  @Expose()
  firmId!: string;

  @Expose()
  firmCaseNumber!: string;

  @Expose()
  courtCaseNumber?: string | null;

  @Expose()
  cnr?: string | null;

  @Expose()
  caseType!: CaseType;

  @Expose()
  court?: string | null;

  @Expose()
  bench?: string | null;

  @Expose()
  presidingJudge?: string | null;

  @Expose()
  currentStageId?: string | null;

  @Expose()
  status!: MatterStatus;

  @Expose()
  filingDate?: Date | null;

  @Expose()
  clientName!: string;

  @Expose()
  clientId?: string | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => CourtStageSummaryEntity)
  currentStage?: CourtStageSummaryEntity | null;

  @Expose()
  @Type(() => MatterAssociateEntity)
  associates?: MatterAssociateEntity[];

  @Expose()
  @Type(() => MatterPartyEntity)
  parties?: MatterPartyEntity[];

  @Expose()
  @Type(() => ClientSummaryEntity)
  client?: ClientSummaryEntity | null;
}
