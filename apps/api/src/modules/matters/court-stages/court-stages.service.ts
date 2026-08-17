import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { CaseType } from "../../../generated/prisma/enums";

@Injectable()
export class CourtStagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(firmId: string) {
    return this.prisma.courtStage.findMany({
      where: {
        OR: [{ firmId: null }, { firmId }]
      },
      orderBy: [{ caseType: "asc" }, { sequenceOrder: "asc" }]
    });
  }

  async findByCaseType(firmId: string, caseType: CaseType) {
    return this.prisma.courtStage.findMany({
      where: {
        caseType,
        OR: [{ firmId: null }, { firmId }]
      },
      orderBy: { sequenceOrder: "asc" }
    });
  }
}
