import { ClassSerializerInterceptor, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { IdempotencyInterceptor } from "./common/interceptors/idempotency.interceptor";
import {
  IDEMPOTENCY_STORE,
  InMemoryIdempotencyStore,
  type IdempotencyStore
} from "./common/idempotency/idempotency.store";
import {
  IdempotencyStoreMode,
  validateEnv,
  type EnvironmentVariables
} from "./config/env.validation";
import { AiModule } from "./modules/ai/ai.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AccessTokenGuard } from "./modules/auth/guards/access-token.guard";
import { RolesGuard } from "./modules/auth/guards/roles.guard";
import { PermissionGuard } from "./modules/auth/guards/permission.guard";
import { TenantGuard } from "./modules/auth/guards/tenant.guard";
import { CaseDocumentsModule } from "./modules/case-documents/case-documents.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { FixedExpensesModule } from "./modules/expenses/fixed-expenses/fixed-expenses.module";
import { ManualExpensesModule } from "./modules/expenses/manual-expenses/manual-expenses.module";
import { RecurringExpensesModule } from "./modules/expenses/recurring-expenses/recurring-expenses.module";
import { FirmsModule } from "./modules/firms/firms.module";
import { AssociatesModule } from "./modules/hr/associates/associates.module";
import { AttendanceModule } from "./modules/hr/attendance/attendance.module";
import { LeaveModule } from "./modules/hr/leave/leave.module";
import { HearingsModule } from "./modules/matters/hearings/hearings.module";
import { MattersModule } from "./modules/matters/matters.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 50 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    AssociatesModule,
    AttendanceModule,
    LeaveModule,
    FixedExpensesModule,
    ManualExpensesModule,
    ExpensesModule,
    RecurringExpensesModule,
    FirmsModule,
    MattersModule,
    HearingsModule,
    TasksModule,
    CaseDocumentsModule,
    ClientsModule,
    AiModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (
        reflector: Reflector,
        config: ConfigService<EnvironmentVariables, true>
      ) =>
        // Dark by default: no store, no enforcement. `memory` is a dev/test
        // stand-in for the IdempotencyRecord table (open problem #8) — never
        // safe across processes in production.
        new IdempotencyInterceptor(
          reflector,
          config.get("IDEMPOTENCY_STORE", { infer: true }) ===
            IdempotencyStoreMode.Memory
            ? new InMemoryIdempotencyStore()
            : undefined
        ),
      inject: [Reflector, ConfigService]
    },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter }
  ]
})
export class AppModule {}
