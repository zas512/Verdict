import { Type } from "class-transformer";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

export class ChatMessageDto {
  @IsString()
  role!: "user" | "assistant" | "system";

  @IsString()
  content!: string;
}

export class ChatAttachmentDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  size?: number;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  base64?: string;
}

export class AiChatDto {
  @IsString()
  message!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @IsOptional()
  history?: ChatMessageDto[];

  @IsString()
  @IsOptional()
  matterId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  @IsOptional()
  attachments?: ChatAttachmentDto[];

  @IsNumber()
  @IsOptional()
  topK?: number;
}

export class AiQueryDto {
  @IsString()
  question!: string;

  @IsString()
  @IsOptional()
  matterId?: string;

  @IsNumber()
  @IsOptional()
  topK?: number;
}
