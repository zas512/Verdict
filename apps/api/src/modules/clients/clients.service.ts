import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { toEntities, toEntity } from "../../common/serialization/serialize";
import { Prisma, UserRole } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { ConflictCheckDto } from "./dto/conflict-check.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { ClientEntity } from "./entities/client.entity";

/** Base client fields; matters are included only on detail queries. */
const CLIENT_SELECT = {
  id: true,
  firmId: true,
  name: true,
  clientType: true,
  contactPerson: true,
  cnic: true,
  companyRegistration: true,
  phone: true,
  email: true,
  address: true,
  notes: true,
  status: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.ClientSelect;

const CLIENT_DETAIL_SELECT = {
  ...CLIENT_SELECT,
  matters: {
    select: {
      id: true,
      firmCaseNumber: true,
      courtCaseNumber: true,
      caseType: true,
      status: true,
      filingDate: true,
      clientName: true
    },
    orderBy: { createdAt: "desc" as const }
  }
} satisfies Prisma.ClientSelect;

/**
 * Normalize a name for conflict matching: lowercase, collapse whitespace,
 * drop punctuation like dots and dashes so "M/S Ah.med" ≈ "ms ahmed".
 */
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.\-]/g, "");
}

/** Strip separators from a CNIC so 35202-1234567-1 ≈ 3520212345671. */
function normalizeCnic(cnic: string): string {
  return cnic.replace(/[\s\-]/g, "");
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(firmId: string, dto: CreateClientDto): Promise<ClientEntity> {
    const client = await this.prisma.client.create({
      data: {
        firmId,
        name: dto.name,
        clientType: dto.clientType,
        contactPerson: dto.contactPerson ?? null,
        cnic: dto.cnic ?? null,
        companyRegistration: dto.companyRegistration ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        notes: dto.notes ?? null,
        status: dto.status
      },
      select: CLIENT_DETAIL_SELECT
    });

    return toEntity(ClientEntity, client);
  }

  async findAll(
    firmId: string,
    role: UserRole,
    associateId?: string
  ): Promise<ClientEntity[]> {
    const where: Prisma.ClientWhereInput = { firmId };

    if (role === UserRole.ASSOCIATE) {
      if (!associateId) {
        throw new ForbiddenException("Associate profile not resolved");
      }
      // Associates only see clients on matters they are assigned to.
      where.matters = {
        some: { associates: { some: { associateId } } }
      };
    }

    const clients = await this.prisma.client.findMany({
      where,
      select: CLIENT_SELECT,
      orderBy: { name: "asc" }
    });

    return toEntities(ClientEntity, clients);
  }

  async findOne(
    id: string,
    firmId: string,
    role: UserRole,
    associateId?: string
  ): Promise<ClientEntity> {
    const client = await this.prisma.client.findFirst({
      where: { id, firmId },
      select: CLIENT_DETAIL_SELECT
    });

    if (!client) {
      throw new NotFoundException("Client not found");
    }

    if (role === UserRole.ASSOCIATE) {
      if (!associateId) {
        throw new ForbiddenException("Associate profile not resolved");
      }
      // Detail select does not carry associates; confirm the client is on a
      // matter the associate is assigned to before exposing the full record.
      const linked = await this.prisma.matter.findFirst({
        where: {
          firmId,
          clientId: id,
          associates: { some: { associateId } }
        },
        select: { id: true }
      });
      if (!linked) {
        throw new ForbiddenException("Access denied to this client");
      }
    }

    return toEntity(ClientEntity, client);
  }

  async update(
    id: string,
    firmId: string,
    dto: UpdateClientDto
  ): Promise<ClientEntity> {
    const existing = await this.prisma.client.findFirst({
      where: { id, firmId },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException("Client not found");
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        name: dto.name,
        clientType: dto.clientType,
        contactPerson: dto.contactPerson,
        cnic: dto.cnic,
        companyRegistration: dto.companyRegistration,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        notes: dto.notes,
        status: dto.status
      },
      select: CLIENT_DETAIL_SELECT
    });

    return toEntity(ClientEntity, updated);
  }

  /**
   * Advisory conflict check. Searches firm Clients, external Parties, and
   * legacy Matter.clientName strings, then logs the run to the AuditLog so
   * every check is on record. A human decides; nothing is auto-blocked.
   */
  async checkConflict(
    firmId: string,
    performedById: string,
    dto: ConflictCheckDto
  ) {
    if (!dto.name.trim()) {
      throw new BadRequestException("Name is required for a conflict check");
    }

    const normalizedName = normalizeName(dto.name);
    const normalizedCnic = dto.cnic ? normalizeCnic(dto.cnic) : null;

    const nameFilter = (field: string) => ({
      contains: normalizedName,
      mode: "insensitive" as const
    });

    const [clientMatches, partyMatches, legacyMatterMatches] =
      await Promise.all([
        this.prisma.client.findMany({
          where: {
            firmId,
            OR: [
              { name: nameFilter("name") },
              ...(normalizedCnic
                ? [
                    { cnic: { contains: normalizedCnic } },
                    { cnic: { equals: normalizedCnic } }
                  ]
                : [])
            ]
          },
          select: {
            id: true,
            name: true,
            cnic: true,
            email: true,
            phone: true,
            status: true,
            matters: {
              select: {
                id: true,
                firmCaseNumber: true,
                courtCaseNumber: true,
                caseType: true,
                status: true
              }
            }
          }
        }),
        this.prisma.party.findMany({
          where: {
            firmId,
            OR: [{ name: nameFilter("name") }]
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            matterLinks: {
              select: {
                partyRole: true,
                matter: {
                  select: {
                    id: true,
                    firmCaseNumber: true,
                    caseType: true,
                    status: true
                  }
                }
              }
            }
          }
        }),
        this.prisma.matter.findMany({
          where: {
            firmId,
            clientId: null,
            clientName: nameFilter("clientName")
          },
          select: {
            id: true,
            firmCaseNumber: true,
            caseType: true,
            status: true,
            clientName: true
          }
        })
      ]);

    await this.prisma.auditLog.create({
      data: {
        firmId,
        entityType: "Client",
        entityId: "conflict-check",
        action: "CONFLICT_CHECK",
        performedById,
        beforeState: { query: { name: dto.name, cnic: dto.cnic ?? null } },
        afterState: {
          clientMatches: clientMatches.length,
          partyMatches: partyMatches.length,
          legacyMatterMatches: legacyMatterMatches.length
        }
      }
    });

    return {
      clients: clientMatches,
      parties: partyMatches.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        email: p.email,
        matters: p.matterLinks.map((l) => l.matter)
      })),
      legacyMatters: legacyMatterMatches
    };
  }
}
