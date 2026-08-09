import { PartialType } from "@nestjs/mapped-types";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { TaskStatus } from "../../../generated/prisma/enums";
import { CreateTaskDto } from "./create-task.dto";

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  completionNotes?: string;
}
