import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { toEntities, toEntity } from "../../common/serialization/serialize";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import {
  CreateTaskNoteDto,
  CreateTaskAttachmentDto
} from "./dto/task-sub-actions.dto";
import { TaskEntity } from "./entities/task.entity";
import {
  TaskStatus,
  TaskAttachmentKind,
  UserRole,
  Prisma
} from "../../generated/prisma/client";

const TASK_SELECT = {
  id: true,
  firmId: true,
  matterId: true,
  hearingId: true,
  createdById: true,
  title: true,
  description: true,
  taskType: true,
  status: true,
  priority: true,
  dueDate: true,
  estimatedHours: true,
  completionNotes: true,
  createdAt: true,
  updatedAt: true,
  matter: {
    select: { id: true, firmCaseNumber: true, clientName: true }
  },
  createdBy: {
    select: { id: true, fullName: true, email: true }
  },
  assignees: {
    select: {
      id: true,
      associateId: true,
      assignedAt: true,
      associate: { select: { id: true, fullName: true, email: true } }
    }
  },
  notes: {
    select: {
      id: true,
      authorId: true,
      note: true,
      createdAt: true,
      author: { select: { id: true, fullName: true, email: true } }
    },
    orderBy: { createdAt: "asc" }
  },
  attachments: {
    select: {
      id: true,
      kind: true,
      fileUrl: true,
      label: true,
      fileName: true,
      mimeType: true,
      cloudinaryPublicId: true,
      uploadedById: true,
      createdAt: true,
      uploadedBy: { select: { id: true, fullName: true, email: true } }
    },
    orderBy: { createdAt: "asc" }
  }
} satisfies Prisma.TaskSelect;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private isAssignee(
    task: { assignees: { associateId: string }[] },
    associateId: string
  ): boolean {
    return task.assignees.some((a) => a.associateId === associateId);
  }

  /**
   * Dedupes and verifies every assignee belongs to the caller's firm.
   */
  private async assertAssigneesInFirm(
    firmId: string,
    assignedToIds: string[]
  ): Promise<string[]> {
    const uniqueIds = [...new Set(assignedToIds)];
    const count = await this.prisma.associate.count({
      where: { id: { in: uniqueIds }, firmId }
    });
    if (count !== uniqueIds.length) {
      throw new BadRequestException(
        "One or more assignees do not belong to your firm"
      );
    }
    return uniqueIds;
  }

  /**
   * Assignable associates for the create/update dialogs. Admins get the full
   * firm roster; an associate gets only themselves (matching the self-assign
   * rule). Returns Associate ids — the join table references Associate, not
   * User, so the /associates roster endpoints (which return user accounts)
   * cannot be reused for task assignment.
   */
  async listAssignees(
    firmId: string,
    role: UserRole,
    callerAssociateId: string
  ): Promise<{ id: string; name: string; email: string | null }[]> {
    const where: Prisma.AssociateWhereInput = { firmId };
    if (role === UserRole.ASSOCIATE) {
      where.id = callerAssociateId;
    }
    const associates = await this.prisma.associate.findMany({
      where,
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" }
    });
    return associates.map((a) => ({
      id: a.id,
      name: a.fullName,
      email: a.email
    }));
  }

  async create(
    firmId: string,
    role: UserRole,
    callerAssociateId: string,
    dto: CreateTaskDto
  ): Promise<TaskEntity> {
    // 1. Role Check: Associates may only create a task for themselves
    if (role === UserRole.ASSOCIATE) {
      const onlySelf =
        dto.assignedToIds.length === 1 &&
        dto.assignedToIds[0] === callerAssociateId;
      if (!onlySelf) {
        throw new ForbiddenException(
          "Associates can only assign tasks to themselves"
        );
      }
    }

    // 2. Validate Matter if provided
    if (dto.matterId) {
      const matter = await this.prisma.matter.findFirst({
        where: { id: dto.matterId, firmId }
      });
      if (!matter) {
        throw new BadRequestException("Matter not found in your firm");
      }
    }

    // 3. Validate Hearing if provided
    if (dto.hearingId) {
      const hearing = await this.prisma.hearing.findFirst({
        where: { id: dto.hearingId, matter: { firmId } }
      });
      if (!hearing) {
        throw new BadRequestException("Hearing not found in your firm");
      }
    }

    const assigneeIds = await this.assertAssigneesInFirm(
      firmId,
      dto.assignedToIds
    );

    const task = await this.prisma.task.create({
      data: {
        firmId,
        matterId: dto.matterId ?? null,
        hearingId: dto.hearingId ?? null,
        createdById: callerAssociateId,
        title: dto.title,
        description: dto.description ?? null,
        taskType: dto.taskType ?? null,
        priority: dto.priority ?? undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedHours: dto.estimatedHours
          ? new Prisma.Decimal(dto.estimatedHours)
          : null,
        status: TaskStatus.PENDING,
        assignees: {
          create: assigneeIds.map((associateId) => ({ associateId }))
        }
      },
      select: TASK_SELECT
    });

    return toEntity(TaskEntity, task);
  }

  async findAll(
    firmId: string,
    role: UserRole,
    callerAssociateId: string,
    filters: {
      matterId?: string;
      status?: TaskStatus;
      assignedToId?: string;
    }
  ): Promise<TaskEntity[]> {
    const where: Prisma.TaskWhereInput = { firmId };

    if (role === UserRole.ASSOCIATE) {
      // ASSOCIATE sees tasks where they are an assignee or the creator
      where.OR = [
        { assignees: { some: { associateId: callerAssociateId } } },
        { createdById: callerAssociateId }
      ];
    } else if (filters.assignedToId) {
      where.assignees = { some: { associateId: filters.assignedToId } };
    }

    if (filters.matterId) {
      where.matterId = filters.matterId;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      select: TASK_SELECT,
      orderBy: { createdAt: "desc" }
    });

    return toEntities(TaskEntity, tasks);
  }

  async findOne(
    id: string,
    firmId: string,
    role: UserRole,
    callerAssociateId: string
  ): Promise<TaskEntity> {
    const task = await this.prisma.task.findFirst({
      where: { id, firmId },
      select: TASK_SELECT
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    if (role === UserRole.ASSOCIATE) {
      const isAssignee = this.isAssignee(task, callerAssociateId);
      const isCreator = task.createdById === callerAssociateId;
      if (!isAssignee && !isCreator) {
        throw new ForbiddenException("Access denied to this task");
      }
    }

    return toEntity(TaskEntity, task);
  }

  async update(
    id: string,
    firmId: string,
    role: UserRole,
    callerAssociateId: string,
    dto: UpdateTaskDto
  ): Promise<TaskEntity> {
    const task = await this.prisma.task.findFirst({
      where: { id, firmId },
      select: {
        id: true,
        createdById: true,
        status: true,
        assignees: { select: { associateId: true } }
      }
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    // Role Checks
    if (role === UserRole.ASSOCIATE) {
      const isAssignee = this.isAssignee(task, callerAssociateId);
      if (!isAssignee) {
        throw new ForbiddenException("You can only update your own tasks");
      }

      // If task is currently UNDER_REVIEW, an associate cannot change its
      // status to COMPLETED directly without admin approval
      if (
        task.status === TaskStatus.UNDER_REVIEW &&
        dto.status === TaskStatus.COMPLETED
      ) {
        throw new ForbiddenException(
          "Only administrators can approve and complete this task"
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Reassignment: replace the full assignee set atomically
      if (dto.assignedToIds) {
        if (role === UserRole.ASSOCIATE) {
          const onlySelf =
            dto.assignedToIds.length === 1 &&
            dto.assignedToIds[0] === callerAssociateId;
          if (!onlySelf) {
            throw new ForbiddenException(
              "Associates can only assign tasks to themselves"
            );
          }
        }
        const assigneeIds = await this.assertAssigneesInFirm(
          firmId,
          dto.assignedToIds
        );
        await tx.taskAssignee.deleteMany({ where: { taskId: id } });
        await tx.taskAssignee.createMany({
          data: assigneeIds.map((associateId) => ({
            taskId: id,
            associateId
          }))
        });
      }

      return tx.task.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          taskType: dto.taskType,
          status: dto.status,
          priority: dto.priority,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          estimatedHours: dto.estimatedHours
            ? new Prisma.Decimal(dto.estimatedHours)
            : undefined,
          completionNotes: dto.completionNotes
        },
        select: TASK_SELECT
      });
    });

    return toEntity(TaskEntity, updated);
  }

  async addNote(
    id: string,
    firmId: string,
    authorAssociateId: string,
    dto: CreateTaskNoteDto
  ): Promise<TaskEntity> {
    const task = await this.prisma.task.findFirst({
      where: { id, firmId },
      include: {
        matter: { include: { associates: true } },
        assignees: { select: { associateId: true } }
      }
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    // Comment visibility: assignee, creator, or matter-assigned associates
    const isAssignee = this.isAssignee(task, authorAssociateId);
    const isCreator = task.createdById === authorAssociateId;
    let isMatterAssigned = false;
    if (task.matter) {
      isMatterAssigned = task.matter.associates.some(
        (a) => a.associateId === authorAssociateId
      );
    }

    if (!isAssignee && !isCreator && !isMatterAssigned) {
      throw new ForbiddenException(
        "You do not have visibility to comment on this task"
      );
    }

    await this.prisma.taskNote.create({
      data: {
        taskId: id,
        authorId: authorAssociateId,
        note: dto.note
      }
    });

    const updated = await this.prisma.task.findFirstOrThrow({
      where: { id },
      select: TASK_SELECT
    });
    return toEntity(TaskEntity, updated);
  }

  async addAttachment(
    id: string,
    firmId: string,
    uploadedById: string,
    dto: CreateTaskAttachmentDto
  ): Promise<TaskEntity> {
    const task = await this.prisma.task.findFirst({
      where: { id, firmId },
      include: {
        matter: { include: { associates: true } },
        assignees: { select: { associateId: true } }
      }
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    // Shared collaboration: assignee, creator, or matter-assigned associate
    const isAssignee = this.isAssignee(task, uploadedById);
    const isCreator = task.createdById === uploadedById;
    let isMatterAssigned = false;
    if (task.matter) {
      isMatterAssigned = task.matter.associates.some(
        (a) => a.associateId === uploadedById
      );
    }

    if (!isAssignee && !isCreator && !isMatterAssigned) {
      throw new ForbiddenException(
        "You do not have visibility to attach files to this task"
      );
    }

    await this.prisma.taskAttachment.create({
      data: {
        taskId: id,
        kind: dto.kind ?? TaskAttachmentKind.FILE,
        fileUrl: dto.fileUrl,
        label: dto.label ?? null,
        fileName: dto.fileName ?? null,
        mimeType: dto.mimeType ?? null,
        cloudinaryPublicId: dto.cloudinaryPublicId ?? null,
        uploadedById
      }
    });

    const updated = await this.prisma.task.findFirstOrThrow({
      where: { id },
      select: TASK_SELECT
    });
    return toEntity(TaskEntity, updated);
  }

  async complete(
    id: string,
    firmId: string,
    assigneeId: string,
    dto: UpdateTaskDto
  ): Promise<TaskEntity> {
    const task = await this.prisma.task.findFirst({
      where: { id, firmId },
      select: {
        id: true,
        assignees: { select: { associateId: true } }
      }
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    if (!this.isAssignee(task, assigneeId)) {
      throw new ForbiddenException(
        "Only the task assignees can complete this task"
      );
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.COMPLETED,
        completionNotes: dto.completionNotes ?? null
      },
      select: TASK_SELECT
    });

    return toEntity(TaskEntity, updated);
  }

  async remove(
    id: string,
    firmId: string,
    role: UserRole,
    callerAssociateId: string
  ): Promise<{ success: boolean }> {
    const task = await this.prisma.task.findFirst({
      where: { id, firmId },
      select: { id: true, createdById: true }
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    const isAdmin = role === UserRole.OWNER || role === UserRole.ADMIN;
    const isCreator = task.createdById === callerAssociateId;
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException(
        "Only an owner, admin, or the task creator can delete this task"
      );
    }

    await this.prisma.task.delete({ where: { id } });
    return { success: true };
  }
}
