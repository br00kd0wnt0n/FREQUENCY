import { create } from 'zustand';
import { NotebookEntry } from '@frequency/shared';

type TabType = 'frequencies' | 'characters' | 'signals' | 'scratchpad';

interface NotebookState {
  entries: NotebookEntry[];
  activeTab: TabType;
  scratchpadContent: string;

  // Actions
  setEntries: (entries: NotebookEntry[]) => void;
  addEntry: (entry: NotebookEntry) => void;
  updateEntry: (id: string, updates: Partial<NotebookEntry>) => void;
  removeEntry: (id: string) => void;
  setActiveTab: (tab: TabType) => void;
  setScratchpadContent: (content: string) => void;
}

export const useNotebookStore = create<NotebookState>((set) => ({
  entries: [],
  activeTab: 'frequencies',
  scratchpadContent: '',

  setEntries: (entries) => set({ entries }),

  addEntry: (entry) =>
    set((state) => ({ entries: [entry, ...state.entries] })),

  updateEntry: (id, updates) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  removeEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    })),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setScratchpadContent: (content) => set({ scratchpadContent: content }),
}));
