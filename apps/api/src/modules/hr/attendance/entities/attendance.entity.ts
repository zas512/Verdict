import { Expose, Type } from "class-transformer";
import type {
  AttendanceSource,
  AttendanceStatus
} from "../../../../generated/prisma/enums";

export class AssociateMinEntity {
  @Expose()
  id: string;

  @Expose()
  fullName: string;

  @Expose()
  email: string | null;
}

export class AttendanceEntity {
  @Expose()
  id: string;

  @Expose()
  associateId: string;

  @Expose()
  date: Date;

  @Expose()
  checkIn: Date | null;

  @Expose()
  checkOut: Date | null;

  @Expose()
  status: AttendanceStatus;

  @Expose()
  source: AttendanceSource;

  @Expose()
  notes: string | null;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => AssociateMinEntity)
  associate?: AssociateMinEntity;
}
