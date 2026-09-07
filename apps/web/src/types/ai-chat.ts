export type MessageRole = "user" | "assistant" | "system";

export type MessageStatus = "sending" | "sent" | "error";

export interface AiAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  content?: string;
  base64?: string;
}

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

export interface AiMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  status?: MessageStatus;
  attachments?: AiAttachment[];
  citations?: LegalCitation[];
  sources?: SourceDocument[];
  feedback?: "liked" | "disliked" | null;
}

export interface AiChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiMessage[];
}

export interface AiChatState {
  isOpen: boolean;
  isThinking: boolean;
  messages: AiMessage[];
  draftInput: string;
  activeCategory: string | null;
  activeMatterId?: string | null;
  historySessions: AiChatSession[];
}
