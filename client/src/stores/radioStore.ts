import { create } from 'zustand';
import { TunedEvent, ScanUpdateEvent, CharacterAudioEvent } from '@frequency/shared';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'character';
  callsign: string;
  text: string;
  timestamp: number;
}

interface RadioState {
  currentFrequency: number;
  broadcastType: string | null;
  label: string | null;
  characterId: string | null;
  characterCallsign: string | null;
  signalId: string | null;
  signalContent: string | null;
  signalEncoded: string | null;
  staticLevel: number;
  isScanning: boolean;
  scanDirection: 'up' | 'down' | null;
  signalStrength: number;
  isPTTActive: boolean;
  isCharacterThinking: boolean;
  lastCharacterResponse: CharacterAudioEvent | null;
  volume: number;
  isAudioInitialized: boolean;
  conversationLog: ConversationMessage[];

  // Actions
  setFrequency: (frequency: number) => void;
  setFrequencyWithReset: (frequency: number) => void;
  setTuned: (event: TunedEvent) => void;
  setScanUpdate: (event: ScanUpdateEvent) => void;
  setScanning: (isScanning: boolean, direction?: 'up' | 'down') => void;
  setPTTActive: (active: boolean) => void;
  setCharacterThinking: (thinking: boolean) => void;
  setCharacterResponse: (response: CharacterAudioEvent | null) => void;
  setVolume: (volume: number) => void;
  setAudioInitialized: (initialized: boolean) => void;
  addConversationMessage: (role: 'user' | 'character', callsign: string, text: string) => void;
  clearConversationLog: () => void;
}

export const useRadioStore = create<RadioState>((set) => ({
  currentFrequency: 27.000,
  broadcastType: null,
  label: null,
  characterId: null,
  characterCallsign: null,
  signalId: null,
  signalContent: null,
  signalEncoded: null,
  staticLevel: 0.9,
  conversationLog: [],
  isScanning: false,
  scanDirection: null,
  signalStrength: 0,
  isPTTActive: false,
  isCharacterThinking: false,
  lastCharacterResponse: null,
  volume: 0.5,
  isAudioInitialized: false,

  setFrequency: (frequency) =>
    set({ currentFrequency: Math.round(frequency * 1000) / 1000 }),

  // Reset broadcast info when scanning away from a frequency
  setFrequencyWithReset: (frequency) =>
    set({
      currentFrequency: Math.round(frequency * 1000) / 1000,
      broadcastType: 'static',
      label: null,
      characterId: null,
      characterCallsign: null,
      signalId: null,
      staticLevel: 0.9,
    }),

  setTuned: (event) =>
    set({
      currentFrequency: event.frequency,
      broadcastType: event.broadcastType,
      label: event.label || null,
      characterId: event.characterId || null,
      characterCallsign: event.characterCallsign || null,
      signalId: event.signalId || null,
      signalContent: event.signalContent || null,
      signalEncoded: event.signalEncoded || null,
      staticLevel: event.staticLevel,
    }),

  setScanUpdate: (event) =>
    set({
      currentFrequency: event.frequency,
      signalStrength: event.signalStrength,
    }),

  setScanning: (isScanning, direction) =>
    set({
      isScanning,
      scanDirection: direction || null,
    }),

  setPTTActive: (active) => set({ isPTTActive: active }),

  setCharacterThinking: (thinking) => set({ isCharacterThinking: thinking }),

  setCharacterResponse: (response) => set({ lastCharacterResponse: response }),

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

  setAudioInitialized: (initialized) => set({ isAudioInitialized: initialized }),

  addConversationMessage: (role, callsign, text) =>
    set((state) => {
      if (!text || !text.trim()) return state;
      return {
        conversationLog: [...state.conversationLog, {
          id: `${Date.now()}-${Math.random()}`,
          role,
          callsign,
          text: text.trim(),
          timestamp: Date.now(),
        }],
      };
    }),

  clearConversationLog: () => set({ conversationLog: [] }),
}));
