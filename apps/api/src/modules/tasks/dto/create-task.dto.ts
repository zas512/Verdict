import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID
} from "class-validator";
import { TaskType, TaskPriority } from "../../../generated/prisma/enums";

export class CreateTaskDto {
  @IsUUID()
  @IsOptional()
  matterId?: string;

  @IsUUID()
  @IsOptional()
  hearingId?: string;

  @IsArray()
  @ArrayNotEmpty({ message: "Assign at least one associate" })
  @ArrayUnique({ message: "Duplicate assignees are not allowed" })
  @IsUUID(undefined, { each: true })
  assignedToIds!: string[];

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskType)
  @IsOptional()
  taskType?: TaskType;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsISO8601()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;
}
