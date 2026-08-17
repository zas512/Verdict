import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { toEntities, toEntity } from "../../common/serialization/serialize";
import { MatterStatus, Prisma, UserRole } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateMatterDto } from "./dto/create-matter.dto";
import {
  AddPartyDto,
  AssignAssociateDto,
  ChangeStageDto,
  ChangeStatusDto
} from "./dto/matter-sub-actions.dto";
import { UpdateMatterDto } from "./dto/update-matter.dto";
import { MatterEntity } from "./entities/matter.entity";
import { PdfReportService } from "./pdf-report.service";

const MATTER_SELECT = {
  id: true,
  firmId: true,
  firmCaseNumber: true,
  courtCaseNumber: true,
  cnr: true,
  caseType: true,
  court: true,
  bench: true,
  presidingJudge: true,
  currentStageId: true,
  status: true,
  filingDate: true,
  clientName: true,
  clientId: true,
  createdAt: true,
  updatedAt: true,
  client: {
    select: {
      id: true,
      name: true
    }
  },
  currentStage: {
    select: {
      id: true,
      name: true,
      sequenceOrder: true
    }
  },
  associates: {
    select: {
      id: true,
      associateId: true,
      role: true,
      associate: {
        select: {
          fullName: true,
          email: true,
          designation: true
        }
      }
    }
  },
  parties: {
    select: {
      id: true,
      partyId: true,
      partyRole: true,
      party: {
        select: {
          name: true,
          phone: true,
          email: true,
          isExternal: true
        }
      }
    }
  }
} satisfies Prisma.MatterSelect;

@Injectable()
export class MattersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfReport: PdfReportService
  ) {}

  async create(firmId: string, dto: CreateMatterDto): Promise<MatterEntity> {
    // 1. Suggest starting stage based on caseType
    const startingStage = await this.prisma.courtStage.findFirst({
      where: {
        caseType: dto.caseType,
        OR: [{ firmId: null }, { firmId }]
      },
      orderBy: { sequenceOrder: "asc" }
    });

    const currentStageId = dto.currentStageId || startingStage?.id || null;

    if (dto.clientId) {
      await this.assertClientInFirm(firmId, dto.clientId);
    }

    // 2. Create the matter in a transaction to handle associations cleanly
    const matter = await this.prisma.$transaction(async (tx) => {
      const created = await tx.matter.create({
        data: {
          firmId,
          firmCaseNumber: dto.firmCaseNumber,
          courtCaseNumber: dto.courtCaseNumber ?? null,
          cnr: dto.cnr ?? null,
          caseType: dto.caseType,
          court: dto.court ?? null,
          bench: dto.bench ?? null,
          presidingJudge: dto.presidingJudge ?? null,
          currentStageId,
          status: MatterStatus.ACTIVE,
          filingDate: dto.filingDate ? new Date(dto.filingDate) : null,
          clientName: dto.clientName,
          clientId: dto.clientId ?? undefined
        },
        select: MATTER_SELECT
      });

      if (dto.associateIds && dto.associateIds.length > 0) {
        await tx.matterAssociate.createMany({
          data: dto.associateIds.map((associateId) => ({
            matterId: created.id,
            associateId,
            role: "Associate"
          }))
        });
      }

      return tx.matter.findFirstOrThrow({
        where: { id: created.id },
        select: MATTER_SELECT
      });
    });

    return toEntity(MatterEntity, matter);
  }

  async findAll(
    firmId: string,
    role: UserRole,
    associateId?: string
  ): Promise<MatterEntity[]> {
    const where: Prisma.MatterWhereInput = { firmId };

    if (role === UserRole.ASSOCIATE) {
      if (!associateId) {
        throw new ForbiddenException("Associate profile not resolved");
      }
      where.associates = { some: { associateId } };
    }

    const matters = await this.prisma.matter.findMany({
      where,
      select: MATTER_SELECT,
      orderBy: { createdAt: "desc" }
    });

    return toEntities(MatterEntity, matters);
  }

  async findOne(
    id: string,
    firmId: string,
    role: UserRole,
    associateId?: string
  ): Promise<MatterEntity> {
    const matter = await this.prisma.matter.findFirst({
      where: { id, firmId },
      select: MATTER_SELECT
    });

    if (!matter) {
      throw new NotFoundException("Matter not found");
    }

    if (role === UserRole.ASSOCIATE) {
      if (!associateId) {
        throw new ForbiddenException("Associate profile not resolved");
      }
      const isAssigned = matter.associates.some(
        (a) => a.associateId === associateId
      );
      if (!isAssigned) {
        throw new ForbiddenException("Access denied to this matter");
      }
    }

    return toEntity(MatterEntity, matter);
  }

  async update(
    id: string,
    firmId: string,
    dto: UpdateMatterDto
  ): Promise<MatterEntity> {
    // Confirm existence
    const existing = await this.prisma.matter.findFirst({
      where: { id, firmId },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException("Matter not found");
    }

    if (dto.clientId) {
      await this.assertClientInFirm(firmId, dto.clientId);
    }

    const data: Prisma.MatterUpdateInput = {
      firmCaseNumber: dto.firmCaseNumber,
      courtCaseNumber: dto.courtCaseNumber,
      cnr: dto.cnr,
      caseType: dto.caseType,
      court: dto.court,
      bench: dto.bench,
      presidingJudge: dto.presidingJudge,
      currentStage:
        dto.currentStageId !== undefined
          ? dto.currentStageId
            ? { connect: { id: dto.currentStageId } }
            : { disconnect: true }
          : undefined,
      filingDate: dto.filingDate ? new Date(dto.filingDate) : undefined,
      clientName: dto.clientName,
      client:
        dto.clientId !== undefined
          ? dto.clientId
            ? { connect: { id: dto.clientId } }
            : { disconnect: true }
          : undefined
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.matter.update({
        where: { id },
        data,
        select: MATTER_SELECT
      });

      if (dto.associateIds) {
        // Replace associates
        await tx.matterAssociate.deleteMany({ where: { matterId: id } });
        if (dto.associateIds.length > 0) {
          await tx.matterAssociate.createMany({
            data: dto.associateIds.map((aId) => ({
              matterId: id,
              associateId: aId,
              role: "Associate"
            }))
          });
        }
      }

      return tx.matter.findFirstOrThrow({
        where: { id },
        select: MATTER_SELECT
      });
    });

    return toEntity(MatterEntity, updated);
  }

  async changeStage(
    id: string,
    firmId: string,
    dto: ChangeStageDto,
    performedById: string
  ): Promise<MatterEntity> {
    const matter = await this.prisma.matter.findFirst({
      where: { id, firmId },
      select: { id: true, currentStageId: true }
    });
    if (!matter) {
      throw new NotFoundException("Matter not found");
    }

    const newStage = await this.prisma.courtStage.findFirst({
      where: {
        id: dto.currentStageId,
        OR: [{ firmId: null }, { firmId }]
      }
    });
    if (!newStage) {
      throw new BadRequestException("Invalid court stage");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Create AuditLog
      await tx.auditLog.create({
        data: {
          firmId,
          entityType: "Matter",
          entityId: id,
          action: "STAGE_CHANGED",
          performedById,
          beforeState:
            matter.currentStageId === null
              ? Prisma.JsonNull
              : { currentStageId: matter.currentStageId },
          afterState:
            dto.currentStageId === null
              ? Prisma.JsonNull
              : { currentStageId: dto.currentStageId }
        }
      });

      return tx.matter.update({
        where: { id },
        data: { currentStageId: dto.currentStageId },
        select: MATTER_SELECT
      });
    });

    return toEntity(MatterEntity, updated);
  }

  async changeStatus(
    id: string,
    firmId: string,
    dto: ChangeStatusDto,
    performedById: string
  ): Promise<MatterEntity> {
    const matter = await this.prisma.matter.findFirst({
      where: { id, firmId },
      select: { id: true, status: true }
    });
    if (!matter) {
      throw new NotFoundException("Matter not found");
    }

    const nextStatus = dto.status.toUpperCase() as MatterStatus;
    if (!Object.values(MatterStatus).includes(nextStatus)) {
      throw new BadRequestException(`Invalid status: ${dto.status}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Create AuditLog
      await tx.auditLog.create({
        data: {
          firmId,
          entityType: "Matter",
          entityId: id,
          action: "STATUS_CHANGED",
          performedById,
          beforeState: { status: matter.status },
          afterState: { status: nextStatus }
        }
      });

      return tx.matter.update({
        where: { id },
        data: { status: nextStatus },
        select: MATTER_SELECT
      });
    });

    return toEntity(MatterEntity, updated);
  }

  async assignAssociate(
    id: string,
    firmId: string,
    dto: AssignAssociateDto
  ): Promise<MatterEntity> {
    const matter = await this.prisma.matter.findFirst({
      where: { id, firmId },
      select: { id: true }
    });
    if (!matter) {
      throw new NotFoundException("Matter not found");
    }

    // Confirm associate exists in the same firm
    const associate = await this.prisma.associate.findFirst({
      where: { id: dto.associateId, firmId }
    });
    if (!associate) {
      throw new BadRequestException("Associate does not belong to your firm");
    }

    await this.prisma.matterAssociate.upsert({
      where: {
        matterId_associateId: {
          matterId: id,
          associateId: dto.associateId
        }
      },
      update: { role: dto.role ?? "Associate" },
      create: {
        matterId: id,
        associateId: dto.associateId,
        role: dto.role ?? "Associate"
      }
    });

    const updated = await this.prisma.matter.findFirstOrThrow({
      where: { id },
      select: MATTER_SELECT
    });
    return toEntity(MatterEntity, updated);
  }

  async removeAssociate(
    id: string,
    firmId: string,
    associateId: string
  ): Promise<MatterEntity> {
    const matter = await this.prisma.matter.findFirst({
      where: { id, firmId },
      select: { id: true }
    });
    if (!matter) {
      throw new NotFoundException("Matter not found");
    }

    await this.prisma.matterAssociate.deleteMany({
      where: { matterId: id, associateId }
    });

    const updated = await this.prisma.matter.findFirstOrThrow({
      where: { id },
      select: MATTER_SELECT
    });
    return toEntity(MatterEntity, updated);
  }

  async addParty(
    id: string,
    firmId: string,
    dto: AddPartyDto
  ): Promise<MatterEntity> {
    const matter = await this.prisma.matter.findFirst({
      where: { id, firmId },
      select: { id: true }
    });
    if (!matter) {
      throw new NotFoundException("Matter not found");
    }

    let partyId = dto.partyId;

    if (!partyId) {
      // Create a new Party inline
      if (!dto.name) {
        throw new BadRequestException(
          "Party name is required when partyId is omitted"
        );
      }
      const createdParty = await this.prisma.party.create({
        data: {
          firmId,
          name: dto.name,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          isExternal: dto.isExternal ?? true
        }
      });
      partyId = createdParty.id;
    } else {
      // Validate party belongs to firm
      const party = await this.prisma.party.findFirst({
        where: { id: partyId, firmId }
      });
      if (!party) {
        throw new BadRequestException("Party does not belong to your firm");
      }
    }

    // Link party to matter
    await this.prisma.matterParty.upsert({
      where: {
        matterId_partyId_partyRole: {
          matterId: id,
          partyId,
          partyRole: dto.partyRole
        }
      },
      update: {},
      create: {
        matterId: id,
        partyId,
        partyRole: dto.partyRole
      }
    });

    const updated = await this.prisma.matter.findFirstOrThrow({
      where: { id },
      select: MATTER_SELECT
    });
    return toEntity(MatterEntity, updated);
  }

  async getTimeline(
    id: string,
    firmId: string,
    role: UserRole,
    associateId?: string
  ) {
    // 1. Confirm access
    await this.findOne(id, firmId, role, associateId);

    const [hearings, completedTasks, docVersions, stageChanges] =
      await Promise.all([
        this.prisma.hearing.findMany({
          where: { matterId: id },
          include: { attendees: { include: { associate: true } } },
          orderBy: { hearingDate: "asc" }
        }),
        this.prisma.task.findMany({
          where: { matterId: id, status: "COMPLETED" },
          orderBy: { updatedAt: "asc" }
        }),
        this.prisma.caseDocumentVersion.findMany({
          where: { document: { matterId: id } },
          orderBy: { createdAt: "asc" }
        }),
        this.prisma.auditLog.findMany({
          where: { entityId: id, action: "STAGE_CHANGED" },
          orderBy: { createdAt: "asc" }
        })
      ]);

    const events = [
      ...hearings.map((h) => ({
        date: h.hearingDate,
        type: "HEARING" as const,
        data: h
      })),
      ...completedTasks.map((t) => ({
        date: t.updatedAt,
        type: "TASK_COMPLETED" as const,
        data: t
      })),
      ...docVersions.map((d) => ({
        date: d.createdAt,
        type: "DOCUMENT_UPLOADED" as const,
        data: d
      })),
      ...stageChanges.map((s) => ({
        date: s.createdAt,
        type: "STAGE_CHANGE" as const,
        data: s
      }))
    ];

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async generateSummaryReport(id: string, firmId: string): Promise<Buffer> {
    const matter = await this.prisma.matter.findFirst({
      where: { id, firmId },
      include: { currentStage: true }
    });
    if (!matter) {
      throw new NotFoundException("Matter not found");
    }

    const timeline = await this.getTimeline(id, firmId, UserRole.OWNER);

    return this.pdfReport.generateMatterSummaryPdf(matter, timeline);
  }

  async findStages(firmId: string) {
    return this.prisma.courtStage.findMany({
      where: {
        OR: [{ firmId: null }, { firmId }]
      },
      orderBy: [{ caseType: "asc" }, { sequenceOrder: "asc" }]
    });
  }

  async findParties(firmId: string) {
    return this.prisma.party.findMany({
      where: { firmId },
      orderBy: { name: "asc" }
    });
  }

  /** Ensure a clientId references a client owned by this firm. */
  private async assertClientInFirm(firmId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, firmId },
      select: { id: true }
    });
    if (!client) {
      throw new BadRequestException("Client does not belong to your firm");
    }
  }
}
