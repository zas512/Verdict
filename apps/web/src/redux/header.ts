import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface HeaderState {
  title: string;
}

const initialState: HeaderState = {
  title: "Dashboard"
};

const headerSlice = createSlice({
  name: "header",
  initialState,
  reducers: {
    setHeaderData: (state, action: PayloadAction<{ title: string }>) => {
      state.title = action.payload.title;
    },
    setHeaderTitle: (state, action: PayloadAction<string>) => {
      state.title = action.payload;
    },
    resetHeader: (state) => {
      state.title = initialState.title;
    }
  }
});

export const { setHeaderData, setHeaderTitle, resetHeader } =
  headerSlice.actions;

export default headerSlice.reducer;
