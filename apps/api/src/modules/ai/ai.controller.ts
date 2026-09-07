import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Public } from "../../common/decorators/public.decorator";
import { UserRole } from "../../generated/prisma/enums";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { JwtPayload } from "../auth/strategies/access-token.strategy";
import { AiService, type UploadedFileInput } from "./ai.service";
import { AiChatDto, AiQueryDto } from "./dto/ai-chat.dto";
import {
  AiChatResponseEntity,
  AiHealthResponseEntity,
  AiUploadResponseEntity
} from "./entities/ai-response.entity";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("chat")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ASSOCIATE)
  async chat(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiChatDto
  ): Promise<AiChatResponseEntity> {
    return this.aiService.chat(dto);
  }

  @Post("upload")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ASSOCIATE)
  @UseInterceptors(FileInterceptor("file"))
  async uploadDocument(
    @UploadedFile() file: UploadedFileInput,
    @CurrentUser() user: JwtPayload,
    @Body("matterId") matterId?: string
  ): Promise<AiUploadResponseEntity> {
    return this.aiService.uploadDocument(file, matterId);
  }

  @Post("query")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ASSOCIATE)
  async query(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiQueryDto
  ): Promise<AiChatResponseEntity> {
    return this.aiService.query(dto);
  }

  @Get("health")
  @Public()
  async health(): Promise<AiHealthResponseEntity> {
    return this.aiService.health();
  }
}
