import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import type { EnvironmentVariables } from "../config/env.validation";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get("DATABASE_URL", { infer: true })
      })
    });
  }

  /**
   * Prisma connects lazily, which means a bad DATABASE_URL first shows up as a
   * failed request. Connecting on init surfaces it at startup instead.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Database connection established");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
