import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";

/** Only the statuses this filter can produce on its own. */
const REASON_PHRASES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "Bad Request",
  [HttpStatus.UNAUTHORIZED]: "Unauthorized",
  [HttpStatus.FORBIDDEN]: "Forbidden",
  [HttpStatus.NOT_FOUND]: "Not Found",
  [HttpStatus.CONFLICT]: "Conflict",
  [HttpStatus.TOO_MANY_REQUESTS]: "Too Many Requests",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "Internal Server Error"
};

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Single global filter rather than a chain of `@Catch(X)` filters: filter
 * ordering for globally bound filters is easy to get subtly wrong, and one
 * filter makes the precedence (Prisma -> HttpException -> unknown) explicit.
 *
 * The emitted body keeps Nest's standard `{ statusCode, message, error }`
 * shape, which the Next.js BFF already reads via `errorData.message`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const body = this.toErrorBody(exception, request);

    if (body.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception)
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown, request: Request): ErrorBody {
    const base = {
      path: request.originalUrl,
      timestamp: new Date().toISOString()
    };

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { status, message } = this.mapPrismaError(exception);
      return {
        ...base,
        statusCode: status,
        message,
        error: this.reasonFor(status)
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === "string") {
        return {
          ...base,
          statusCode: status,
          message: payload,
          error: this.reasonFor(status)
        };
      }

      const { message, error } = payload as {
        message?: string | string[];
        error?: string;
      };
      return {
        ...base,
        statusCode: status,
        message: message ?? exception.message,
        error: error ?? this.reasonFor(status)
      };
    }

    return {
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
      error: this.reasonFor(HttpStatus.INTERNAL_SERVER_ERROR)
    };
  }

  /**
   * Without this mapping a duplicate key or a missing row surfaces as an opaque
   * 500 — e.g. the `@@unique([associateId, date])` on Attendance.
   */
  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    switch (exception.code) {
      case "P2002": {
        const target = exception.meta?.target;
        const fields = Array.isArray(target) ? target.join(", ") : "field";
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${fields} already exists`
        };
      }
      case "P2025":
        return {
          status: HttpStatus.NOT_FOUND,
          message: "The requested record was not found"
        };
      case "P2003":
        return {
          status: HttpStatus.BAD_REQUEST,
          message: "Related record does not exist"
        };
      case "P2014":
        return {
          status: HttpStatus.BAD_REQUEST,
          message: "The change would violate a required relation"
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Internal server error"
        };
    }
  }

  private reasonFor(status: number): string {
    return REASON_PHRASES[status] ?? "Error";
  }
}
