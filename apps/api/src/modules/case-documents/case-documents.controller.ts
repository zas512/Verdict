import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  ForbiddenException
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { JwtPayload } from "../auth/strategies/access-token.strategy";
import { UserRole } from "../../generated/prisma/enums";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { CreateVersionDto } from "./dto/create-version.dto";
import { CaseDocumentsService } from "./case-documents.service";
import {
  CaseDocumentEntity,
  CaseDocumentVersionEntity
} from "./entities/case-document.entity";

@Controller()
@Roles(UserRole.OWNER, UserRole.ASSOCIATE)
export class CaseDocumentsController {
  constructor(private readonly documentsService: CaseDocumentsService) {}

  @Post("matters/:matterId/documents")
  async create(
    @Param("matterId", ParseUUIDPipe) matterId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDocumentDto
  ): Promise<CaseDocumentEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.documentsService.create(matterId, user.firmId, user, dto);
  }

  @Get("matters/:matterId/documents")
  async findAllForMatter(
    @Param("matterId", ParseUUIDPipe) matterId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<CaseDocumentEntity[]> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.documentsService.findAllForMatter(matterId, user.firmId, user);
  }

  @Post("case-documents/:id/versions")
  async createVersion(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateVersionDto
  ): Promise<CaseDocumentVersionEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.documentsService.createVersion(id, user.firmId, user, dto);
  }

  @Get("case-documents/:id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<CaseDocumentEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.documentsService.findOne(id, user.firmId, user);
  }

  @Get("case-documents/:id/versions")
  async findVersions(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<CaseDocumentVersionEntity[]> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    return this.documentsService.findVersions(id, user.firmId, user);
  }
}
