import { query, queryOne } from '../config/database';
import { NarrativeState } from '@frequency/shared';

export interface NarrativeUpdate {
  flag: string;
  source: string;
  message?: string;
  newFrequency?: number;
}

export class NarrativeEngine {
  async getUserFlags(userId: string): Promise<string[]> {
    const flags = await query<{ flag_key: string }>(
      `SELECT flag_key FROM narrative_state WHERE user_id = $1`,
      [userId]
    );
    return flags.map(f => f.flag_key);
  }

  async setFlag(
    userId: string,
    flagKey: string,
    sourceType: 'character' | 'signal' | 'action',
    sourceId?: string
  ): Promise<boolean> {
    const existing = await queryOne<NarrativeState>(
      `SELECT * FROM narrative_state WHERE user_id = $1 AND flag_key = $2`,
      [userId, flagKey]
    );

    if (existing) return false; // Already set

    await query(
      `INSERT INTO narrative_state (user_id, flag_key, source_type, source_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, flagKey, sourceType, sourceId || null]
    );

    return true;
  }

  async checkTriggers(userId: string, context: {
    characterId?: string;
    signalId?: string;
    action?: string;
  }): Promise<NarrativeUpdate[]> {
    const updates: NarrativeUpdate[] = [];
    const currentFlags = await this.getUserFlags(userId);

    // Check for character-based triggers
    if (context.characterId) {
      const character = await queryOne<{ callsign: string }>(
        `SELECT callsign FROM characters WHERE id = $1`,
        [context.characterId]
      );

      if (character) {
        const metFlag = `met_${character.callsign.toLowerCase()}`;
        if (!currentFlags.includes(metFlag)) {
          await this.setFlag(userId, metFlag, 'character', context.characterId);
          updates.push({
            flag: metFlag,
            source: character.callsign,
            message: `Contact established with ${character.callsign}`,
          });
        }
      }
    }

    // Check for signal-based triggers
    if (context.signalId) {
      const signal = await queryOne<{ reward_type: string; reward_value: string }>(
        `SELECT reward_type, reward_value FROM signals WHERE id = $1`,
        [context.signalId]
      );

      if (signal && signal.reward_type === 'frequency') {
        const newFreq = parseFloat(signal.reward_value);
        if (!isNaN(newFreq)) {
          updates.push({
            flag: `unlocked_freq_${signal.reward_value}`,
            source: 'signal',
            message: `New frequency discovered: ${signal.reward_value}`,
            newFrequency: newFreq,
          });
        }
      }
    }

    return updates;
  }

  async getAvailableContent(userId: string): Promise<{
    characters: string[];
    signals: string[];
    frequencies: number[];
  }> {
    const flags = await this.getUserFlags(userId);

    // Characters available to this user
    const characters = await query<{ id: string }>(
      `SELECT id FROM characters WHERE is_active = true`
    );

    // Signals available based on narrative triggers
    const signals = await query<{ id: string }>(
      `SELECT id FROM signals
       WHERE is_active = true
         AND (narrative_trigger IS NULL OR narrative_trigger = ANY($1))`,
      [flags]
    );

    // Frequencies available
    const frequencies = await query<{ frequency: number }>(
      `SELECT frequency FROM frequencies
       WHERE is_discoverable = true
         AND (requires_flag IS NULL OR requires_flag = ANY($1))`,
      [flags]
    );

    return {
      characters: characters.map(c => c.id),
      signals: signals.map(s => s.id),
      frequencies: frequencies.map(f => Number(f.frequency)),
    };
  }
}

export const narrativeEngine = new NarrativeEngine();
