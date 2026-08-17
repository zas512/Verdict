import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import compression from "compression";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { generateDependencyGraph } from "./common/dependency-graph";
import { NodeEnv, type EnvironmentVariables } from "./config/env.validation";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.setGlobalPrefix("api");
  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: config
      .get("CORS_ORIGIN", { infer: true })
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  // Lets PrismaService.onModuleDestroy run on SIGTERM/SIGINT so in-flight
  // queries and the connection pool are closed cleanly.
  app.enableShutdownHooks();

  if (config.get("NODE_ENV", { infer: true }) !== NodeEnv.Production) {
    generateDependencyGraph(app);
  }

  // The default was 3001 while .env.example and the web client both use 4000.
  const port = config.get("PORT", { infer: true });
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api`, "Bootstrap");
}

void bootstrap();
