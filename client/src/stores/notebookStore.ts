import { create } from 'zustand';
import { NotebookEntry } from '@frequency/shared';

type TabType = 'frequencies' | 'characters' | 'signals' | 'scratchpad';

// Starter notes - scribbled hints for demo/testing
const starterNotes: NotebookEntry[] = [
  {
    id: 'starter-1',
    user_id: '',
    entry_type: 'note',
    title: 'Friendly voice - 27 MHz band',
    content: `Picked up someone late last night scanning the 27 MHz range.
Sounded like a trucker - friendly, a bit nervous maybe?
Signal was clearest somewhere between 27.400 and 27.500.
Called himself "Roadrunner" I think? Try calling out if you find him.`,
    frequency_ref: 27.450,
    character_ref: null,
    signal_ref: null,
    is_pinned: true,
    tags: ['voice', 'lead'],
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15'),
  },
  {
    id: 'starter-2',
    user_id: '',
    entry_type: 'note',
    title: 'Woman\'s voice - 28 MHz band',
    content: `I heard someone... a woman's voice, very faint.
Something strange happening around 28.150 and 28.250.
Static drops when you get close. Tune VERY slowly or you'll miss her.
She sounds like she's waiting for someone. Calls herself Nightbird?
Said something about "the tower" before I lost the signal.`,
    frequency_ref: 28.200,
    character_ref: null,
    signal_ref: null,
    is_pinned: true,
    tags: ['voice', 'lead', 'mystery'],
    created_at: new Date('2024-01-14'),
    updated_at: new Date('2024-01-14'),
  },
  {
    id: 'starter-3',
    user_id: '',
    entry_type: 'note',
    title: 'Morse code signal - 29 MHz',
    content: `Something strange around 29 MHz. Not voice - beeping.
Pretty sure it's morse code. Repeating pattern, over and over.
Searched between 29.050 and 29.150 - signal is in there somewhere.
Managed to catch part of it: "THE TOWER..." something.
THE TOWER REMEMBERS? What tower? Need to decode the rest.`,
    frequency_ref: 29.100,
    character_ref: null,
    signal_ref: null,
    is_pinned: false,
    tags: ['signal', 'morse', 'mystery'],
    created_at: new Date('2024-01-13'),
    updated_at: new Date('2024-01-13'),
  },
  {
    id: 'starter-4',
    user_id: '',
    entry_type: 'note',
    title: 'Numbers station - 30 MHz',
    content: `This one gave me chills. Found it scanning the 30 MHz range.
Robotic voice just reading numbers. No emotion. Repeating.
Signal somewhere between 30.450 and 30.550 - hard to pinpoint.
Wrote down what I heard: 7-3-9-1-4-2-8
Same sequence, over and over. What does it mean?
Feels like a code. Or coordinates? Someone is broadcasting this deliberately.`,
    frequency_ref: 30.500,
    character_ref: null,
    signal_ref: null,
    is_pinned: false,
    tags: ['signal', 'numbers', 'mystery'],
    created_at: new Date('2024-01-12'),
    updated_at: new Date('2024-01-12'),
  },
];

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
  entries: [...starterNotes],
  activeTab: 'frequencies',
  scratchpadContent: '',

  setEntries: (entries) => set(() => {
    // If server sends entries, merge with starter notes (keep starters that aren't duplicates)
    const starterIds = starterNotes.map(n => n.id);
    const serverEntries = entries.filter(e => !starterIds.includes(e.id));
    // Keep starter notes, add server entries on top
    return { entries: [...serverEntries, ...starterNotes] };
  }),

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
