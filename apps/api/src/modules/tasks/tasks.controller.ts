import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { JwtPayload } from "../auth/strategies/access-token.strategy";
import { TaskStatus, UserRole } from "../../generated/prisma/enums";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import {
  CreateTaskNoteDto,
  CreateTaskAttachmentDto
} from "./dto/task-sub-actions.dto";
import { TasksService } from "./tasks.service";
import { TaskEntity } from "./entities/task.entity";
import { UsersService } from "../users/users.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

@Controller("tasks")
@Roles(UserRole.OWNER, UserRole.ASSOCIATE)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  // Must be declared before @Get(":id") so the literal path is not swallowed
  // by the UUID route param.
  @Get("assignees")
  async listAssignees(
    @CurrentUser() user: JwtPayload
  ): Promise<{ id: string; name: string; email: string | null }[]> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    const associateId = await this.usersService.resolveAssociateId(user.sub);
    return this.tasksService.listAssignees(user.firmId, user.role, associateId);
  }

  @Get("uploads/signature")
  getUploadSignature(@CurrentUser() user: JwtPayload) {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `lga/firms/${user.firmId}/tasks`;
    return this.cloudinaryService.signUpload({ timestamp, folder });
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTaskDto
  ): Promise<TaskEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    const associateId = await this.usersService.resolveAssociateId(user.sub);
    return this.tasksService.create(user.firmId, user.role, associateId, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query("matterId") matterId?: string,
    @Query("status") status?: TaskStatus,
    @Query("assignedToId") assignedToId?: string
  ): Promise<TaskEntity[]> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    const associateId = await this.usersService.resolveAssociateId(user.sub);
    return this.tasksService.findAll(user.firmId, user.role, associateId, {
      matterId,
      status,
      assignedToId
    });
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<TaskEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    const associateId = await this.usersService.resolveAssociateId(user.sub);
    return this.tasksService.findOne(id, user.firmId, user.role, associateId);
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTaskDto
  ): Promise<TaskEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    const associateId = await this.usersService.resolveAssociateId(user.sub);
    return this.tasksService.update(
      id,
      user.firmId,
      user.role,
      associateId,
      dto
    );
  }

  @Post(":id/notes")
  async addNote(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTaskNoteDto
  ): Promise<TaskEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    const associateId = await this.usersService.resolveAssociateId(user.sub);
    return this.tasksService.addNote(id, user.firmId, associateId, dto);
  }

  @Post(":id/attachments")
  async addAttachment(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTaskAttachmentDto
  ): Promise<TaskEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    const associateId = await this.usersService.resolveAssociateId(user.sub);
    return this.tasksService.addAttachment(id, user.firmId, associateId, dto);
  }

  @Patch(":id/complete")
  async complete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTaskDto
  ): Promise<TaskEntity> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    const associateId = await this.usersService.resolveAssociateId(user.sub);
    return this.tasksService.complete(id, user.firmId, associateId, dto);
  }

  @Delete(":id")
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ success: boolean }> {
    if (!user.firmId) {
      throw new ForbiddenException("Must belong to a firm");
    }
    const associateId = await this.usersService.resolveAssociateId(user.sub);
    return this.tasksService.remove(id, user.firmId, user.role, associateId);
  }
}
