import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { DocumentCategory } from "../../../generated/prisma/enums";

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(DocumentCategory)
  @IsNotEmpty()
  category!: DocumentCategory;

  @IsString()
  @IsNotEmpty()
  fileUrl!: string;
}
