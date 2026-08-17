import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { TaskAttachmentKind } from "../../../generated/prisma/enums";

export class CreateTaskNoteDto {
  @IsString()
  @IsNotEmpty()
  note!: string;
}

export class CreateTaskAttachmentDto {
  @IsEnum(TaskAttachmentKind)
  @IsOptional()
  kind?: TaskAttachmentKind;

  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsString()
  @IsOptional()
  cloudinaryPublicId?: string;
}
