export interface LegalCitation {
  title: string;
  source: string;
  year?: string;
  summary?: string;
}

export interface SourceDocument {
  document_id: string;
  document_name: string;
  chunk_text: string;
  similarity_score: number;
  page_number?: number;
}

export class AiChatResponseEntity {
  answer!: string;
  citations?: LegalCitation[];
  sources?: SourceDocument[];
  confidence!: number;
  has_answer!: boolean;
  matter_id?: string | null;
}

export class AiUploadResponseEntity {
  status!: string;
  document_id?: string | null;
  filename?: string | null;
  file_type?: string | null;
  text_preview?: string | null;
  content?: string | null;
  chunks_created!: number;
  matter_id?: string | null;
  message!: string;
}

export class AiHealthResponseEntity {
  status!: string;
  environment!: string;
  llm_model!: string;
  embedding_model!: string;
  collection_stats!: Record<string, unknown>;
}
