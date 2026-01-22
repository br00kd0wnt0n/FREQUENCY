import { create } from 'zustand';
import { TunedEvent, ScanUpdateEvent, CharacterAudioEvent } from '@frequency/shared';

interface RadioState {
  currentFrequency: number;
  broadcastType: string | null;
  label: string | null;
  characterId: string | null;
  characterCallsign: string | null;
  signalId: string | null;
  staticLevel: number;
  isScanning: boolean;
  scanDirection: 'up' | 'down' | null;
  signalStrength: number;
  isPTTActive: boolean;
  isCharacterThinking: boolean;
  lastCharacterResponse: CharacterAudioEvent | null;

  // Actions
  setFrequency: (frequency: number) => void;
  setTuned: (event: TunedEvent) => void;
  setScanUpdate: (event: ScanUpdateEvent) => void;
  setScanning: (isScanning: boolean, direction?: 'up' | 'down') => void;
  setPTTActive: (active: boolean) => void;
  setCharacterThinking: (thinking: boolean) => void;
  setCharacterResponse: (response: CharacterAudioEvent | null) => void;
}

export const useRadioStore = create<RadioState>((set) => ({
  currentFrequency: 27.000,
  broadcastType: null,
  label: null,
  characterId: null,
  characterCallsign: null,
  signalId: null,
  staticLevel: 0.9,
  isScanning: false,
  scanDirection: null,
  signalStrength: 0,
  isPTTActive: false,
  isCharacterThinking: false,
  lastCharacterResponse: null,

  setFrequency: (frequency) =>
    set({ currentFrequency: Math.round(frequency * 1000) / 1000 }),

  setTuned: (event) =>
    set({
      currentFrequency: event.frequency,
      broadcastType: event.broadcastType,
      label: event.label || null,
      characterId: event.characterId || null,
      characterCallsign: event.characterCallsign || null,
      signalId: event.signalId || null,
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
}));
