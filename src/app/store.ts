import { create } from "zustand";

export type Screen = "title" | "lobby" | "quest" | "collection" | "deck" | "battle";

interface AppState {
  screen: Screen;
  setScreen(screen: Screen): void;
}

export const useAppStore = create<AppState>((set) => ({
  screen: "title",
  setScreen: (screen) => set({ screen }),
}));
