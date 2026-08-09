import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength
} from "class-validator";
import { AttendanceStatus } from "../../../../generated/prisma/enums";

export class CheckInDto {
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  clientDate?: string;
}

export class CreateAttendanceDto {
  /** Calendar day, `YYYY-MM-DD`. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" })
  date!: string;

  @IsISO8601()
  checkIn!: string;

  @IsISO8601()
  checkOut!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}
