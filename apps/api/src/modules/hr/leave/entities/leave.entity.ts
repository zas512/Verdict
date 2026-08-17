import { Expose, Type } from "class-transformer";
import type { LeaveRequestStatus } from "../../../../generated/prisma/enums";

export class LeaveTypeMinEntity {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

export class AssociateMinEntity {
  @Expose()
  id: string;

  @Expose()
  fullName: string;

  @Expose()
  email: string | null;
}

export class LeaveTypeEntity {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  annualAllotment: number;

  @Expose()
  carriesForward: boolean;
}

export class LeaveRequestEntity {
  @Expose()
  id: string;

  @Expose()
  associateId: string;

  @Expose()
  leaveTypeId: string;

  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;

  @Expose()
  reason: string | null;

  @Expose()
  status: LeaveRequestStatus;

  @Expose()
  approverId: string | null;

  @Expose()
  decidedAt: Date | null;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => LeaveTypeMinEntity)
  leaveType?: LeaveTypeMinEntity;

  @Expose()
  @Type(() => AssociateMinEntity)
  associate?: AssociateMinEntity;
}

export class LeaveBalanceEntity {
  @Expose()
  id: string;

  @Expose()
  associateId: string;

  @Expose()
  leaveTypeId: string;

  @Expose()
  year: number;

  @Expose()
  allotted: number;

  @Expose()
  used: number;

  @Expose()
  @Type(() => LeaveTypeMinEntity)
  leaveType?: LeaveTypeMinEntity;
}
