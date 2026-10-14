import { configureStore } from "@reduxjs/toolkit";
import aiChatReducer from "./aiChat";
import dialerReducer from "./dialer";
import headerReducer from "./header";
import uiReducer from "./ui";

export const store = configureStore({
  reducer: {
    header: headerReducer,
    ui: uiReducer,
    dialer: dialerReducer,
    aiChat: aiChatReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
