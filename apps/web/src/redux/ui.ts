import { createSlice } from "@reduxjs/toolkit";

interface UiState {
  sidebarOpen: boolean;
}

const initialState: UiState = {
  sidebarOpen: false
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openSidebar: (state) => {
      state.sidebarOpen = true;
    },
    closeSidebar: (state) => {
      state.sidebarOpen = false;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    }
  }
});

export const { openSidebar, closeSidebar, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
