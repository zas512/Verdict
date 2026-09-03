import { AiChatState, AiMessage } from "@/types/ai-chat";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: AiChatState = {
  isOpen: false,
  isThinking: false,
  messages: [],
  draftInput: "",
  activeCategory: null,
  historySessions: []
};

const aiChatSlice = createSlice({
  name: "aiChat",
  initialState,
  reducers: {
    openAiChat: (state) => {
      state.isOpen = true;
    },
    closeAiChat: (state) => {
      state.isOpen = false;
    },
    toggleAiChat: (state) => {
      state.isOpen = !state.isOpen;
    },
    setAiChatOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload;
    },
    setThinking: (state, action: PayloadAction<boolean>) => {
      state.isThinking = action.payload;
    },
    setDraftInput: (state, action: PayloadAction<string>) => {
      state.draftInput = action.payload;
    },
    setActiveCategory: (state, action: PayloadAction<string | null>) => {
      state.activeCategory = action.payload;
    },
    addMessage: (state, action: PayloadAction<AiMessage>) => {
      state.messages.push(action.payload);
    },
    updateMessage: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<AiMessage> }>
    ) => {
      const index = state.messages.findIndex((m) => m.id === action.payload.id);
      if (index !== -1) {
        state.messages[index] = {
          ...state.messages[index],
          ...action.payload.updates
        };
      }
    },
    setMessageFeedback: (
      state,
      action: PayloadAction<{
        id: string;
        feedback: "liked" | "disliked" | null;
      }>
    ) => {
      const message = state.messages.find((m) => m.id === action.payload.id);
      if (message) {
        message.feedback = action.payload.feedback;
      }
    },
    clearMessages: (state) => {
      if (state.messages.length > 0) {
        // Save previous session to history
        const firstUserMsg = state.messages.find((m) => m.role === "user");
        const title = firstUserMsg
          ? firstUserMsg.content.slice(0, 40) +
            (firstUserMsg.content.length > 40 ? "..." : "")
          : "Chat Session";
        state.historySessions.unshift({
          id: `session-${Date.now()}`,
          title,
          createdAt: state.messages[0]?.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [...state.messages]
        });
      }
      state.messages = [];
      state.isThinking = false;
    }
  }
});

export const {
  openAiChat,
  closeAiChat,
  toggleAiChat,
  setAiChatOpen,
  setThinking,
  setDraftInput,
  setActiveCategory,
  addMessage,
  updateMessage,
  setMessageFeedback,
  clearMessages
} = aiChatSlice.actions;

export default aiChatSlice.reducer;
