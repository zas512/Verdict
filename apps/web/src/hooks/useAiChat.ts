import { isAiEnabled } from "@/config/ai";
import { api } from "@/lib/api";
import {
  addMessage,
  clearMessages,
  closeAiChat,
  openAiChat,
  setActiveCategory,
  setDraftInput,
  setMessageFeedback,
  setThinking,
  toggleAiChat
} from "@/redux/aiChat";
import { AppDispatch, RootState } from "@/redux/store";
import {
  AiAttachment,
  AiMessage,
  LegalCitation,
  SourceDocument
} from "@/types/ai-chat";
import axios from "axios";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

interface AiApiResponse {
  answer: string;
  citations?: LegalCitation[];
  sources?: SourceDocument[];
  confidence?: number;
  has_answer?: boolean;
}

export function useAiChat() {
  const dispatch = useDispatch<AppDispatch>();
  const enabled = isAiEnabled();
  const isOpen = useSelector((state: RootState) => state.aiChat.isOpen);
  const isThinking = useSelector((state: RootState) => state.aiChat.isThinking);
  const messages = useSelector((state: RootState) => state.aiChat.messages);
  const draftInput = useSelector((state: RootState) => state.aiChat.draftInput);
  const activeCategory = useSelector(
    (state: RootState) => state.aiChat.activeCategory
  );
  const activeMatterId = useSelector(
    (state: RootState) => state.aiChat.activeMatterId
  );

  const send = useCallback(
    async (content: string, attachments?: AiAttachment[]) => {
      const trimmed = content.trim();
      if (!trimmed && (!attachments || attachments.length === 0)) return;

      const userMsg: AiMessage = {
        id: `msg-user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
        status: "sent",
        attachments
      };

      // Add user message & clear draft
      dispatch(addMessage(userMsg));
      dispatch(setDraftInput(""));
      dispatch(setThinking(true));

      // Build history for multi-turn conversational context
      const history = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content
      }));

      // Prepare attachment payloads
      const payloadAttachments = attachments?.map((att) => ({
        id: att.id,
        name: att.name,
        type: att.type,
        size: att.size,
        content: att.content,
        base64: att.base64
      }));

      try {
        const response = await api.post<AiApiResponse>(
          "/ai/chat",
          {
            message:
              trimmed ||
              "Please review the attached document(s) and provide a summary.",
            history,
            attachments: payloadAttachments,
            matterId: activeMatterId ?? null
          },
          {
            timeout: 180000
          }
        );

        const data = response.data;
        const answerText =
          typeof data?.answer === "string"
            ? data.answer
            : typeof data === "string"
              ? data
              : "I have reviewed your query, but could not formulate a structured answer.";

        const aiMsg: AiMessage = {
          id: `msg-ai-${Date.now()}`,
          role: "assistant",
          content: answerText,
          timestamp: new Date().toISOString(),
          status: "sent",
          citations: Array.isArray(data?.citations) ? data.citations : [],
          sources: Array.isArray(data?.sources) ? data.sources : []
        };

        dispatch(addMessage(aiMsg));
      } catch (error: unknown) {
        let messageText =
          "Could not generate AI response. Please verify the AI service and Ollama model are running.";

        if (axios.isAxiosError(error) && error.response?.data?.message) {
          messageText = String(error.response.data.message);
        } else if (error instanceof Error) {
          messageText = error.message;
        }

        toast.error("AI assistant encountered an issue", {
          description: messageText
        });

        const errorAiMsg: AiMessage = {
          id: `msg-ai-err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **AI Service Error**: ${messageText}\n\nPlease verify that Ollama and the AI backend are running.`,
          timestamp: new Date().toISOString(),
          status: "error"
        };
        dispatch(addMessage(errorAiMsg));
      } finally {
        dispatch(setThinking(false));
      }
    },
    [dispatch, messages, activeMatterId]
  );

  const clear = useCallback(() => {
    dispatch(clearMessages());
  }, [dispatch]);

  const handleFeedback = useCallback(
    (messageId: string, feedback: "liked" | "disliked" | null) => {
      dispatch(setMessageFeedback({ id: messageId, feedback }));
    },
    [dispatch]
  );

  return {
    enabled,
    isOpen,
    isThinking,
    messages,
    draftInput,
    activeCategory,
    open: () => dispatch(openAiChat()),
    close: () => dispatch(closeAiChat()),
    toggle: () => dispatch(toggleAiChat()),
    setDraft: (text: string) => dispatch(setDraftInput(text)),
    setCategory: (cat: string | null) => dispatch(setActiveCategory(cat)),
    sendMessage: send,
    clearChat: clear,
    setFeedback: handleFeedback
  };
}
