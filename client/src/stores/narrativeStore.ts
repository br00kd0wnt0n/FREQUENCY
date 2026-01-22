import { create } from 'zustand';
import { NarrativeUpdateEvent } from '@frequency/shared';

interface NarrativeState {
  flags: string[];
  notifications: NarrativeUpdateEvent[];

  // Actions
  setFlags: (flags: string[]) => void;
  addFlag: (flag: string) => void;
  addNotification: (notification: NarrativeUpdateEvent) => void;
  clearNotification: (index: number) => void;
}

export const useNarrativeStore = create<NarrativeState>((set) => ({
  flags: [],
  notifications: [],

  setFlags: (flags) => set({ flags }),

  addFlag: (flag) =>
    set((state) => ({
      flags: state.flags.includes(flag) ? state.flags : [...state.flags, flag],
    })),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),

  clearNotification: (index) =>
    set((state) => ({
      notifications: state.notifications.filter((_, i) => i !== index),
    })),
}));
