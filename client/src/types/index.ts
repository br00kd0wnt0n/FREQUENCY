// Re-export shared types
export * from '@frequency/shared';

// Client-specific types
export interface AudioEngineState {
  isInitialized: boolean;
  isPlaying: boolean;
  staticLevel: number;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}
