// ============================================
// FREQUENCY - Shared Types
// ============================================

// -------------------- Database Models --------------------

export interface User {
  id: string;
  created_at: Date;
  last_session: Date | null;
  session_count: number;
}

export interface Character {
  id: string;
  callsign: string;
  display_name: string | null;
  frequency: number;
  elevenlabs_voice_id: string;
  voice_description: string | null;
  personality_prompt: string;
  speaking_style: string | null;
  background: string | null;
  knowledge: Record<string, string>;
  secrets: string[];
  relationships: Record<string, string>;
  initial_disposition: 'friendly' | 'suspicious' | 'hostile' | 'neutral';
  is_active: boolean;
  created_at: Date;
}

export interface Conversation {
  id: string;
  user_id: string;
  character_id: string;
  started_at: Date;
  last_message_at: Date | null;
  message_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'character';
  content: string;
  audio_url: string | null;
  created_at: Date;
}

export interface CharacterTrust {
  id: string;
  user_id: string;
  character_id: string;
  trust_level: number;
  interactions_count: number;
  revealed_secrets: number[];
  updated_at: Date;
}

export interface Signal {
  id: string;
  signal_type: 'morse' | 'numbers' | 'ambient';
  frequency: number;
  content_text: string | null;
  content_encoded: string | null;
  cipher_type: string | null;
  cipher_key: string | null;
  narrative_trigger: string | null;
  reward_type: 'frequency' | 'info' | 'password' | 'story_beat' | null;
  reward_value: string | null;
  is_looping: boolean;
  is_active: boolean;
  schedule: Record<string, unknown> | null;
  created_at: Date;
}

export interface Frequency {
  id: string;
  frequency: number;
  broadcast_type: 'voice' | 'morse' | 'numbers' | 'ambient' | 'static';
  source_type: 'character' | 'signal' | null;
  source_id: string | null;
  is_discoverable: boolean;
  requires_flag: string | null;
  label: string | null;
  static_level: number;
  updated_at: Date;
}

export interface NarrativeState {
  id: string;
  user_id: string;
  flag_key: string;
  flag_value: unknown;
  unlocked_at: Date;
  source_type: 'character' | 'signal' | 'action' | null;
  source_id: string | null;
}

export interface NotebookEntry {
  id: string;
  user_id: string;
  entry_type: 'frequency' | 'character' | 'signal' | 'note' | 'scratchpad';
  title: string | null;
  content: string | null;
  frequency_ref: number | null;
  character_ref: string | null;
  signal_ref: string | null;
  is_pinned: boolean;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

// -------------------- WebSocket Events --------------------

// Client → Server
export interface ConnectPayload {
  userId?: string;
}

export interface TunePayload {
  frequency: number;
}

export interface ScanPayload {
  direction: 'up' | 'down';
  speed: 'slow' | 'fast';
}

export interface StopScanPayload {}

export interface PTTStartPayload {
  frequency: number;
}

export interface PTTEndPayload {
  frequency: number;
  transcript: string;
  audioBase64?: string;
}

export interface NotebookAddPayload {
  entryType: NotebookEntry['entry_type'];
  title?: string;
  content: string;
  frequencyRef?: number;
  characterRef?: string;
  signalRef?: string;
}

export interface NotebookUpdatePayload {
  entryId: string;
  title?: string;
  content?: string;
  isPinned?: boolean;
  tags?: string[];
}

export interface NotebookDeletePayload {
  entryId: string;
}

// Server → Client
export interface FrequencyInfo {
  frequency: number;
  broadcastType: Frequency['broadcast_type'];
  label?: string;
  isDiscoverable: boolean;
}

export interface ConnectedEvent {
  userId: string;
  sessionId: string;
  frequencyMap: FrequencyInfo[];
  notebookEntries: NotebookEntry[];
  narrativeState: string[];
}

export interface TunedEvent {
  frequency: number;
  broadcastType: Frequency['broadcast_type'];
  label?: string;
  characterId?: string;
  characterCallsign?: string;
  signalId?: string;
  staticLevel: number;
}

export interface ScanUpdateEvent {
  frequency: number;
  signalStrength: number;
  blip?: 'voice' | 'morse' | 'numbers';
}

export interface CharacterAudioEvent {
  characterId: string;
  audioUrl?: string;
  audioBase64?: string;
  transcript: string;
  duration: number;
}

export interface CharacterThinkingEvent {
  characterId: string;
  isThinking: boolean;
}

export interface SignalAudioEvent {
  signalId: string;
  signalType: 'morse' | 'numbers';
  audioUrl?: string;
  audioBase64?: string;
  duration: number;
  isLooping: boolean;
}

export interface NarrativeUpdateEvent {
  flag: string;
  source: string;
  message?: string;
  newFrequency?: number;
}

export interface NotebookSyncEvent {
  entries: NotebookEntry[];
}

export interface ErrorEvent {
  code: string;
  message: string;
}

// -------------------- Socket Event Names --------------------

export const SocketEvents = {
  // Client → Server
  CONNECT: 'connect',
  TUNE: 'tune',
  SCAN: 'scan',
  STOP_SCAN: 'stop_scan',
  PTT_START: 'ptt_start',
  PTT_END: 'ptt_end',
  NOTEBOOK_ADD: 'notebook_add',
  NOTEBOOK_UPDATE: 'notebook_update',
  NOTEBOOK_DELETE: 'notebook_delete',

  // Server → Client
  CONNECTED: 'connected',
  TUNED: 'tuned',
  SCAN_UPDATE: 'scan_update',
  CHARACTER_AUDIO: 'character_audio',
  CHARACTER_THINKING: 'character_thinking',
  SIGNAL_AUDIO: 'signal_audio',
  NARRATIVE_UPDATE: 'narrative_update',
  NOTEBOOK_SYNC: 'notebook_sync',
  ERROR: 'error',
} as const;
