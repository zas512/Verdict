import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { toEntities, toEntity } from "../../common/serialization/serialize";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { CreateVersionDto } from "./dto/create-version.dto";
import { CaseDocumentEntity, CaseDocumentVersionEntity } from "./entities/case-document.entity";
import { UserRole, Prisma } from "../../generated/prisma/client";
import { MattersService } from "../matters/matters.service";
import { JwtPayload } from "../auth/strategies/access-token.strategy";
import { UsersService } from "../users/users.service";

const DOCUMENT_SELECT = {
  id: true,
  matterId: true,
  title: true,
  category: true,
  createdAt: true,
  versions: {
    select: {
      id: true,
      documentId: true,
      versionNumber: true,
      fileUrl: true,
      uploadedById: true,
      changeNotes: true,
      isCurrent: true,
      createdAt: true
    }
  }
} satisfies Prisma.CaseDocumentSelect;

@Injectable()
export class CaseDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mattersService: MattersService,
    private readonly users: UsersService
  ) {}

  /**
   * Documents are scoped to the caller's own matters. `MattersService.findOne`
   * expects the *Associate* id for ASSOCIATE callers, not the User id — the
   * previous code passed `user.sub` here, so associates could never open
   * documents of matters they were assigned to.
   */
  private async resolveAssociateId(
    user: JwtPayload
  ): Promise<string | undefined> {
    return user.role === UserRole.ASSOCIATE
      ? this.users.resolveAssociateId(user.sub)
      : undefined;
  }

  async create(
    matterId: string,
    firmId: string,
    user: JwtPayload,
    dto: CreateDocumentDto
  ): Promise<CaseDocumentEntity> {
    // 1. Verify access to matter
    await this.mattersService.findOne(
      matterId,
      firmId,
      user.role,
      await this.resolveAssociateId(user)
    );

    const doc = await this.prisma.$transaction(async (tx) => {
      // 2. Create Logical Document
      const createdDoc = await tx.caseDocument.create({
        data: {
          matterId,
          title: dto.title,
          category: dto.category
        }
      });

      // 3. Create Version #1
      await tx.caseDocumentVersion.create({
        data: {
          documentId: createdDoc.id,
          versionNumber: 1,
          fileUrl: dto.fileUrl,
          uploadedById: user.sub,
          isCurrent: true
        }
      });

      return tx.caseDocument.findUniqueOrThrow({
        where: { id: createdDoc.id },
        select: DOCUMENT_SELECT
      });
    });

    return toEntity(CaseDocumentEntity, doc);
  }

  async createVersion(
    documentId: string,
    firmId: string,
    user: JwtPayload,
    dto: CreateVersionDto
  ): Promise<CaseDocumentVersionEntity> {
    // 1. Find logical document and check firm
    const doc = await this.prisma.caseDocument.findFirst({
      where: { id: documentId, matter: { firmId } },
      select: { id: true, matterId: true }
    });
    if (!doc) {
      throw new NotFoundException("Document not found");
    }

    // 2. Check matter access
    await this.mattersService.findOne(
      doc.matterId,
      firmId,
      user.role,
      await this.resolveAssociateId(user)
    );

    const newVersion = await this.prisma.$transaction(async (tx) => {
      // 3. Calculate max version number
      const maxVersion = await tx.caseDocumentVersion.aggregate({
        where: { documentId },
        _max: { versionNumber: true }
      });
      const nextVersionNum = (maxVersion._max.versionNumber ?? 0) + 1;

      // 4. Set all existing versions to isCurrent = false
      await tx.caseDocumentVersion.updateMany({
        where: { documentId },
        data: { isCurrent: false }
      });

      // 5. Create new version as current
      const createdVersion = await tx.caseDocumentVersion.create({
        data: {
          documentId,
          versionNumber: nextVersionNum,
          fileUrl: dto.fileUrl,
          uploadedById: user.sub,
          changeNotes: dto.changeNotes ?? null,
          isCurrent: true
        }
      });

      // 6. Write AuditLog
      await tx.auditLog.create({
        data: {
          firmId,
          entityType: "CaseDocument",
          entityId: documentId,
          action: "DOCUMENT_VERSIONED",
          performedById: user.sub,
          beforeState: { isCurrent: true, versionNumber: nextVersionNum - 1 } as any,
          afterState: { isCurrent: true, versionNumber: nextVersionNum } as any
        }
      });

      return createdVersion;
    });

    return toEntity(CaseDocumentVersionEntity, newVersion);
  }

  async findOne(
    id: string,
    firmId: string,
    user: JwtPayload
  ): Promise<CaseDocumentEntity> {
    const doc = await this.prisma.caseDocument.findFirst({
      where: { id, matter: { firmId } },
      select: {
        id: true,
        matterId: true,
        title: true,
        category: true,
        createdAt: true,
        versions: {
          where: { isCurrent: true },
          select: {
            id: true,
            documentId: true,
            versionNumber: true,
            fileUrl: true,
            uploadedById: true,
            changeNotes: true,
            isCurrent: true,
            createdAt: true
          }
        }
      }
    });

    if (!doc) {
      throw new NotFoundException("Document not found");
    }

    // Verify access
    await this.mattersService.findOne(
      doc.matterId,
      firmId,
      user.role,
      await this.resolveAssociateId(user)
    );

    return toEntity(CaseDocumentEntity, doc);
  }

  async findVersions(
    id: string,
    firmId: string,
    user: JwtPayload
  ): Promise<CaseDocumentVersionEntity[]> {
    const doc = await this.prisma.caseDocument.findFirst({
      where: { id, matter: { firmId } },
      select: { id: true, matterId: true }
    });

    if (!doc) {
      throw new NotFoundException("Document not found");
    }

    // Verify access
    await this.mattersService.findOne(
      doc.matterId,
      firmId,
      user.role,
      await this.resolveAssociateId(user)
    );

    const versions = await this.prisma.caseDocumentVersion.findMany({
      where: { documentId: id },
      orderBy: { versionNumber: "desc" }
    });

    return toEntities(CaseDocumentVersionEntity, versions);
  }

  async findAllForMatter(
    matterId: string,
    firmId: string,
    user: JwtPayload
  ): Promise<CaseDocumentEntity[]> {
    // 1. Verify access to matter
    await this.mattersService.findOne(
      matterId,
      firmId,
      user.role,
      await this.resolveAssociateId(user)
    );

    const docs = await this.prisma.caseDocument.findMany({
      where: { matterId },
      select: DOCUMENT_SELECT,
      orderBy: { createdAt: "desc" }
    });

    return toEntities(CaseDocumentEntity, docs);
  }
}
