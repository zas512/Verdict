import {
  Injectable,
  NotFoundException,
  BadRequestException
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { toEntities, toEntity } from "../../../common/serialization/serialize";
import { CreateHearingDto } from "./dto/create-hearing.dto";
import { UpdateHearingDto } from "./dto/update-hearing.dto";
import { LogAttendeesDto } from "./dto/log-attendees.dto";
import { HearingEntity } from "./entities/hearing.entity";
import {
  HearingStatus,
  UserRole,
  Prisma
} from "../../../generated/prisma/client";
import { MattersService } from "../matters.service";
import { NotificationsService } from "../notifications.service";
import { JwtPayload } from "../../auth/strategies/access-token.strategy";
import { UsersService } from "../../users/users.service";

@Injectable()
export class HearingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mattersService: MattersService,
    private readonly notificationsService: NotificationsService,
    private readonly users: UsersService
  ) {}

  /**
   * Hearings are scoped to the caller's own matters. `MattersService.findOne`
   * expects the *Associate* id for ASSOCIATE callers, not the User id — the
   * previous code passed `user.sub` here, so associates could never see
   * hearings of matters they were assigned to.
   */
  private async resolveAssociateId(
    user: JwtPayload
  ): Promise<string | undefined> {
    return user.role === UserRole.ASSOCIATE
      ? this.users.resolveAssociateId(user.sub)
      : undefined;
  }

  async create(
    matterId: string,
    firmId: string,
    user: JwtPayload,
    dto: CreateHearingDto
  ): Promise<HearingEntity> {
    // 1. Validate matter access (will throw NotFoundException or ForbiddenException if access is invalid)
    await this.mattersService.findOne(
      matterId,
      firmId,
      user.role,
      await this.resolveAssociateId(user)
    );

    const hearing = await this.prisma.$transaction(async (tx) => {
      // 2. Create the current hearing record
      const created = await tx.hearing.create({
        data: {
          matterId,
          hearingDate: new Date(dto.hearingDate),
          purpose: dto.purpose,
          presidingJudge: dto.presidingJudge ?? null,
          proceedingsSummary: dto.proceedingsSummary ?? null,
          orderSheetUrl: dto.orderSheetUrl ?? null,
          nextDate: dto.nextDate ? new Date(dto.nextDate) : null,
          nextPurpose: dto.nextPurpose ?? null,
          status: dto.status ?? HearingStatus.SCHEDULED,
          createdById: user.sub
        },
        include: { attendees: true }
      });

      if (dto.attendeeAssociateIds && dto.attendeeAssociateIds.length > 0) {
        await tx.hearingAttendee.createMany({
          data: dto.attendeeAssociateIds.map((associateId) => ({
            hearingId: created.id,
            associateId
          }))
        });
      }

      // 3. Tareekh-e-Pesh Engine: Auto-create next scheduled hearing if nextDate is set and status is not SCHEDULED
      const isOutcomeLogged = created.status !== HearingStatus.SCHEDULED;
      if (isOutcomeLogged && created.nextDate) {
        const nextHearing = await tx.hearing.create({
          data: {
            matterId,
            hearingDate: created.nextDate,
            purpose: created.nextPurpose ?? "Next Date of Hearing",
            status: HearingStatus.SCHEDULED,
            createdById: user.sub
          }
        });

        // Trigger notification stub
        await this.notificationsService.scheduleHearingReminder(
          nextHearing.id,
          nextHearing.hearingDate,
          nextHearing.purpose
        );
      }

      return tx.hearing.findUniqueOrThrow({
        where: { id: created.id },
        include: { attendees: true }
      });
    });

    return toEntity(HearingEntity, hearing);
  }

  async findAll(
    matterId: string,
    firmId: string,
    user: JwtPayload
  ): Promise<HearingEntity[]> {
    // Validate access
    await this.mattersService.findOne(
      matterId,
      firmId,
      user.role,
      await this.resolveAssociateId(user)
    );

    const hearings = await this.prisma.hearing.findMany({
      where: { matterId },
      include: { attendees: true },
      orderBy: { hearingDate: "desc" }
    });

    return toEntities(HearingEntity, hearings);
  }

  /**
   * Upcoming Tareekh for the whole firm: future SCHEDULED hearings, nearest
   * first, each carrying a compact matter summary so a landing view can render
   * the next date without a second query. ASSOCIATE callers only see hearings
   * on matters they are a part of (same rule as `findAll`).
   */
  async findUpcoming(user: JwtPayload): Promise<HearingEntity[]> {
    const firmId = user.firmId;
    if (!firmId) {
      throw new BadRequestException("Must belong to a firm");
    }

    const associateId = await this.resolveAssociateId(user);
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const matterWhere: Prisma.MatterWhereInput = { firmId };
    if (user.role === UserRole.ASSOCIATE && associateId) {
      matterWhere.associates = { some: { associateId } };
    }

    const hearings = await this.prisma.hearing.findMany({
      where: {
        status: HearingStatus.SCHEDULED,
        hearingDate: { gte: todayStart },
        matter: matterWhere
      },
      include: {
        attendees: true,
        matter: {
          select: {
            id: true,
            firmCaseNumber: true,
            courtCaseNumber: true,
            clientName: true,
            court: true,
            bench: true,
            caseType: true,
            currentStage: { select: { name: true } }
          }
        }
      },
      orderBy: { hearingDate: "asc" },
      take: 25
    });

    return toEntities(HearingEntity, hearings);
  }

  async update(
    id: string,
    firmId: string,
    user: JwtPayload,
    dto: UpdateHearingDto
  ): Promise<HearingEntity> {
    // 1. Locate hearing and verify it belongs to this firm
    const hearing = await this.prisma.hearing.findFirst({
      where: { id, matter: { firmId } },
      select: { id: true, matterId: true, status: true, nextDate: true }
    });
    if (!hearing) {
      throw new NotFoundException("Hearing not found");
    }

    // 2. Validate access to the associated matter
    await this.mattersService.findOne(
      hearing.matterId,
      firmId,
      user.role,
      await this.resolveAssociateId(user)
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      // 3. Update the hearing details
      const current = await tx.hearing.update({
        where: { id },
        data: {
          hearingDate: dto.hearingDate ? new Date(dto.hearingDate) : undefined,
          purpose: dto.purpose,
          presidingJudge: dto.presidingJudge,
          proceedingsSummary: dto.proceedingsSummary,
          orderSheetUrl: dto.orderSheetUrl,
          nextDate: dto.nextDate ? new Date(dto.nextDate) : undefined,
          nextPurpose: dto.nextPurpose,
          status: dto.status
        },
        include: { attendees: true }
      });

      if (dto.attendeeAssociateIds) {
        await tx.hearingAttendee.deleteMany({ where: { hearingId: id } });
        if (dto.attendeeAssociateIds.length > 0) {
          await tx.hearingAttendee.createMany({
            data: dto.attendeeAssociateIds.map((associateId) => ({
              hearingId: id,
              associateId
            }))
          });
        }
      }

      // 4. Tareekh-e-Pesh Engine: Log outcome if status changed to held/adjourned/sine_die/decided and nextDate is set
      const previouslyScheduled = hearing.status === HearingStatus.SCHEDULED;
      const nowOutcomeLogged = current.status !== HearingStatus.SCHEDULED;

      if (nowOutcomeLogged && current.nextDate) {
        // Only trigger auto-creation if we didn't already have a nextDate set (prevents duplicate triggers on editing)
        const isNewOutcome = previouslyScheduled || !hearing.nextDate;

        if (isNewOutcome) {
          const nextHearing = await tx.hearing.create({
            data: {
              matterId: current.matterId,
              hearingDate: current.nextDate,
              purpose: current.nextPurpose ?? "Next Date of Hearing",
              status: HearingStatus.SCHEDULED,
              createdById: user.sub
            }
          });

          await this.notificationsService.scheduleHearingReminder(
            nextHearing.id,
            nextHearing.hearingDate,
            nextHearing.purpose
          );
        }
      }

      return tx.hearing.findUniqueOrThrow({
        where: { id },
        include: { attendees: true }
      });
    });

    return toEntity(HearingEntity, updated);
  }

  async logAttendees(
    id: string,
    firmId: string,
    dto: LogAttendeesDto
  ): Promise<HearingEntity> {
    const hearing = await this.prisma.hearing.findFirst({
      where: { id, matter: { firmId } },
      select: { id: true }
    });
    if (!hearing) {
      throw new NotFoundException("Hearing not found");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.hearingAttendee.deleteMany({ where: { hearingId: id } });
      if (dto.associateIds.length > 0) {
        await tx.hearingAttendee.createMany({
          data: dto.associateIds.map((associateId) => ({
            hearingId: id,
            associateId
          }))
        });
      }

      return tx.hearing.findUniqueOrThrow({
        where: { id },
        include: { attendees: true }
      });
    });

    return toEntity(HearingEntity, updated);
  }
}
