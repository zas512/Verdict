import { Expose, Type } from "class-transformer";
import { DocumentCategory } from "../../../generated/prisma/enums";

export class CaseDocumentVersionEntity {
  @Expose()
  id!: string;

  @Expose()
  documentId!: string;

  @Expose()
  versionNumber!: number;

  @Expose()
  fileUrl!: string;

  @Expose()
  uploadedById!: string;

  @Expose()
  changeNotes?: string | null;

  @Expose()
  isCurrent!: boolean;

  @Expose()
  createdAt!: Date;
}

export class CaseDocumentEntity {
  @Expose()
  id!: string;

  @Expose()
  matterId!: string;

  @Expose()
  title!: string;

  @Expose()
  category!: DocumentCategory;

  @Expose()
  createdAt!: Date;

  @Expose()
  @Type(() => CaseDocumentVersionEntity)
  versions?: CaseDocumentVersionEntity[];
}
