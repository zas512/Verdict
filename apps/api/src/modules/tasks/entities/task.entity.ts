import { Expose, Type } from "class-transformer";
import {
  TaskType,
  TaskStatus,
  TaskPriority,
  TaskAttachmentKind
} from "../../../generated/prisma/enums";
import { AssociateMinEntity } from "../../hr/attendance/entities/attendance.entity";

export class TaskNoteSummaryEntity {
  @Expose()
  id!: string;

  @Expose()
  authorId!: string;

  @Expose()
  note!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  @Type(() => AssociateMinEntity)
  author?: AssociateMinEntity;
}

export class TaskAttachmentSummaryEntity {
  @Expose()
  id!: string;

  @Expose()
  kind!: TaskAttachmentKind;

  @Expose()
  fileUrl!: string;

  @Expose()
  label?: string | null;

  @Expose()
  fileName?: string | null;

  @Expose()
  mimeType?: string | null;

  @Expose()
  cloudinaryPublicId?: string | null;

  @Expose()
  uploadedById!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  @Type(() => AssociateMinEntity)
  uploadedBy?: AssociateMinEntity;
}

export class TaskAssigneeSummaryEntity {
  @Expose()
  id!: string;

  @Expose()
  associateId!: string;

  @Expose()
  assignedAt!: Date;

  @Expose()
  @Type(() => AssociateMinEntity)
  associate?: AssociateMinEntity;
}

export class TaskMatterSummaryEntity {
  @Expose()
  id!: string;

  @Expose()
  firmCaseNumber!: string;

  @Expose()
  clientName!: string;
}

export class TaskEntity {
  @Expose()
  id!: string;

  @Expose()
  firmId!: string;

  @Expose()
  matterId?: string | null;

  @Expose()
  hearingId?: string | null;

  @Expose()
  createdById!: string;

  @Expose()
  title!: string;

  @Expose()
  description?: string | null;

  @Expose()
  taskType?: TaskType | null;

  @Expose()
  status!: TaskStatus;

  @Expose()
  priority!: TaskPriority;

  @Expose()
  dueDate?: Date | null;

  @Expose()
  @Type(() => Number)
  estimatedHours?: number | null;

  @Expose()
  completionNotes?: string | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  get isOverdue(): boolean {
    const overdueStatuses: TaskStatus[] = [
      TaskStatus.PENDING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.UNDER_REVIEW
    ];
    if (this.dueDate && overdueStatuses.includes(this.status)) {
      return new Date(this.dueDate).getTime() < Date.now();
    }
    return false;
  }

  @Expose()
  @Type(() => TaskMatterSummaryEntity)
  matter?: TaskMatterSummaryEntity;

  @Expose()
  @Type(() => AssociateMinEntity)
  createdBy?: AssociateMinEntity;

  @Expose()
  @Type(() => TaskAssigneeSummaryEntity)
  assignees?: TaskAssigneeSummaryEntity[];

  @Expose()
  @Type(() => TaskNoteSummaryEntity)
  notes?: TaskNoteSummaryEntity[];

  @Expose()
  @Type(() => TaskAttachmentSummaryEntity)
  attachments?: TaskAttachmentSummaryEntity[];
}
