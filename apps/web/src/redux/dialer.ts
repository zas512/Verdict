import { createSlice } from "@reduxjs/toolkit";

interface DialerState {
  isOpen: boolean;
}

const initialState: DialerState = {
  isOpen: false
};

const dialerSlice = createSlice({
  name: "dialer",
  initialState,
  reducers: {
    toggleDialer: (state) => {
      state.isOpen = !state.isOpen;
    }
  }
});

export const { toggleDialer } = dialerSlice.actions;

export default dialerSlice.reducer;
