-- FREQUENCY Database Schema
-- Initial migration

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_session TIMESTAMP WITH TIME ZONE,
  session_count INTEGER DEFAULT 0
);

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  callsign VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  frequency DECIMAL(6,3) NOT NULL,
  elevenlabs_voice_id VARCHAR(100) NOT NULL,
  voice_description TEXT,
  personality_prompt TEXT NOT NULL,
  speaking_style TEXT,
  background TEXT,
  knowledge JSONB NOT NULL DEFAULT '{}',
  secrets JSONB NOT NULL DEFAULT '[]',
  relationships JSONB NOT NULL DEFAULT '{}',
  initial_disposition VARCHAR(20) DEFAULT 'neutral',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  UNIQUE(user_id, character_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- Character trust table
CREATE TABLE IF NOT EXISTS character_trust (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  trust_level INTEGER DEFAULT 0,
  interactions_count INTEGER DEFAULT 0,
  revealed_secrets JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, character_id)
);

-- Signals table
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type VARCHAR(20) NOT NULL,
  frequency DECIMAL(6,3) NOT NULL,
  content_text TEXT,
  content_encoded TEXT,
  cipher_type VARCHAR(50),
  cipher_key TEXT,
  narrative_trigger VARCHAR(100),
  reward_type VARCHAR(50),
  reward_value TEXT,
  is_looping BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  schedule JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Frequencies table
CREATE TABLE IF NOT EXISTS frequencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency DECIMAL(6,3) NOT NULL UNIQUE,
  broadcast_type VARCHAR(20) NOT NULL,
  source_type VARCHAR(20),
  source_id UUID,
  is_discoverable BOOLEAN DEFAULT true,
  requires_flag VARCHAR(100),
  label VARCHAR(100),
  static_level DECIMAL(3,2) DEFAULT 0.5,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Narrative state table
CREATE TABLE IF NOT EXISTS narrative_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  flag_key VARCHAR(100) NOT NULL,
  flag_value JSONB DEFAULT 'true',
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source_type VARCHAR(20),
  source_id UUID,
  UNIQUE(user_id, flag_key)
);

CREATE INDEX IF NOT EXISTS idx_narrative_user ON narrative_state(user_id);

-- Notebook entries table
CREATE TABLE IF NOT EXISTS notebook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  entry_type VARCHAR(20) NOT NULL,
  title VARCHAR(200),
  content TEXT,
  frequency_ref DECIMAL(6,3),
  character_ref UUID REFERENCES characters(id),
  signal_ref UUID REFERENCES signals(id),
  is_pinned BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notebook_user ON notebook_entries(user_id, entry_type);
