import {
  Injectable,
  Logger,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiChatDto, AiQueryDto } from "./dto/ai-chat.dto";
import {
  AiChatResponseEntity,
  AiHealthResponseEntity,
  AiUploadResponseEntity
} from "./entities/ai-response.entity";

export interface UploadedFileInput {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const rawUrl =
      this.config.get<string>("AI_SERVICE_URL") ??
      "http://localhost:5000/api/ai";
    this.aiBaseUrl = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === "string") {
      return error;
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "object" && error !== null) {
      try {
        return JSON.stringify(error);
      } catch {
        return "Unknown error object";
      }
    }
    if (typeof error === "number" || typeof error === "boolean") {
      return error.toString();
    }
    return "Unknown error";
  }

  async chat(dto: AiChatDto): Promise<AiChatResponseEntity> {
    const url = `${this.aiBaseUrl}/chat`;
    this.logger.log(
      `Forwarding chat prompt to AI Service: "${dto.message.slice(0, 50)}..." (${dto.attachments?.length ?? 0} attachments)`
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: dto.message,
          history: dto.history ?? [],
          matter_id: dto.matterId ?? null,
          attachments: dto.attachments ?? [],
          top_k: dto.topK ?? 5
        }),
        signal: AbortSignal.timeout(180_000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `AI service returned ${response.status}: ${errorText}`
        );
        throw new ServiceUnavailableException(
          `AI Service responded with status ${response.status}: ${errorText}`
        );
      }

      const data = (await response.json()) as AiChatResponseEntity;
      return data;
    } catch (error: unknown) {
      const message = this.getErrorMessage(error);
      this.logger.error(
        `Failed to reach Python AI service at ${url}: ${message}`
      );
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        `AI service unavailable. Ensure the Python AI server is running at ${this.aiBaseUrl}. (Error: ${message})`
      );
    }
  }

  /**
   * Upload and process a legal document in Python AI service
   */
  async uploadDocument(
    file: UploadedFileInput,
    matterId?: string
  ): Promise<AiUploadResponseEntity> {
    const url = `${this.aiBaseUrl}/upload`;
    this.logger.log(
      `Uploading document "${file.originalname}" to AI service (matterId: ${matterId ?? "none"})`
    );

    try {
      const formData = new FormData();
      const blob = new Blob([file.buffer as unknown as BlobPart], {
        type: file.mimetype
      });
      formData.append("file", blob, file.originalname);
      if (matterId) {
        formData.append("matter_id", matterId);
      }

      const response = await fetch(url, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(120_000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `AI service upload error ${response.status}: ${errorText}`
        );
        throw new ServiceUnavailableException(
          `Failed to process document in AI service: ${errorText}`
        );
      }

      const data = (await response.json()) as AiUploadResponseEntity;
      return data;
    } catch (error: unknown) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Document upload to AI service failed: ${message}`);
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        `Failed to upload document to AI service: ${message}`
      );
    }
  }

  /**
   * Direct question / RAG query against case documents
   */
  async query(dto: AiQueryDto): Promise<AiChatResponseEntity> {
    const url = `${this.aiBaseUrl}/query`;
    this.logger.log(
      `Forwarding query to AI Service: "${dto.question.slice(0, 50)}..."`
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: dto.question,
          matter_id: dto.matterId ?? null,
          top_k: dto.topK ?? 5
        }),
        signal: AbortSignal.timeout(90_000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ServiceUnavailableException(`AI service error: ${errorText}`);
      }

      const data = (await response.json()) as AiChatResponseEntity;
      return data;
    } catch (error: unknown) {
      const message = this.getErrorMessage(error);
      this.logger.error(`AI query failed: ${message}`);
      throw new ServiceUnavailableException(
        `AI service unavailable: ${message}`
      );
    }
  }

  /**
   * Health and setup status
   */
  async health(): Promise<AiHealthResponseEntity> {
    const url = `${this.aiBaseUrl}/health`;
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(5_000)
      });

      if (!response.ok) {
        return {
          status: "degraded",
          environment: "unknown",
          llm_model: "unknown",
          embedding_model: "unknown",
          collection_stats: { error: `HTTP ${response.status}` }
        };
      }

      return (await response.json()) as AiHealthResponseEntity;
    } catch (error: unknown) {
      const message = this.getErrorMessage(error);
      return {
        status: "disconnected",
        environment: "unknown",
        llm_model: "unknown",
        embedding_model: "unknown",
        collection_stats: { error: message }
      };
    }
  }
}
