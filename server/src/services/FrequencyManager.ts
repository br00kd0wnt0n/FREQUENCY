import { query, queryOne } from '../config/database';
import { Frequency, FrequencyInfo, Character, Signal } from '@frequency/shared';

export class FrequencyManager {
  async getFrequencyMap(userId?: string): Promise<FrequencyInfo[]> {
    // Get base frequencies
    const frequencies = await query<Frequency & { character_callsign?: string }>(
      `SELECT f.*, c.callsign as character_callsign
       FROM frequencies f
       LEFT JOIN characters c ON f.source_type = 'character' AND f.source_id = c.id
       WHERE f.is_discoverable = true
       ORDER BY f.frequency ASC`
    );

    // If user provided, filter by narrative requirements
    let userFlags: string[] = [];
    if (userId) {
      const flags = await query<{ flag_key: string }>(
        `SELECT flag_key FROM narrative_state WHERE user_id = $1`,
        [userId]
      );
      userFlags = flags.map(f => f.flag_key);
    }

    return frequencies
      .filter(f => {
        if (!f.requires_flag) return true;
        return userFlags.includes(f.requires_flag);
      })
      .map(f => ({
        frequency: Number(f.frequency),
        broadcastType: f.broadcast_type,
        label: f.label || undefined,
        isDiscoverable: f.is_discoverable,
      }));
  }

  async getFrequencyInfo(frequency: number): Promise<{
    frequency: Frequency;
    character?: Character;
    signal?: Signal;
  } | null> {
    const freq = await queryOne<Frequency>(
      `SELECT * FROM frequencies WHERE frequency = $1`,
      [frequency]
    );

    if (!freq) return null;

    let character: Character | undefined;
    let signal: Signal | undefined;

    if (freq.source_type === 'character' && freq.source_id) {
      character = await queryOne<Character>(
        `SELECT * FROM characters WHERE id = $1`,
        [freq.source_id]
      ) || undefined;
    } else if (freq.source_type === 'signal' && freq.source_id) {
      signal = await queryOne<Signal>(
        `SELECT * FROM signals WHERE id = $1`,
        [freq.source_id]
      ) || undefined;
    }

    return { frequency: freq, character, signal };
  }

  async findNearestSignal(currentFrequency: number, direction: 'up' | 'down'): Promise<Frequency | null> {
    const operator = direction === 'up' ? '>' : '<';
    const order = direction === 'up' ? 'ASC' : 'DESC';

    return queryOne<Frequency>(
      `SELECT * FROM frequencies
       WHERE frequency ${operator} $1
         AND broadcast_type != 'static'
         AND is_discoverable = true
       ORDER BY frequency ${order}
       LIMIT 1`,
      [currentFrequency]
    );
  }

  async unlockFrequency(frequency: number, userId: string, flagKey: string): Promise<boolean> {
    // Add narrative flag for the user
    await query(
      `INSERT INTO narrative_state (user_id, flag_key, source_type, source_id)
       VALUES ($1, $2, 'action', NULL)
       ON CONFLICT (user_id, flag_key) DO NOTHING`,
      [userId, flagKey]
    );

    return true;
  }

  calculateStaticLevel(targetFrequency: number, nearestSignalFrequency: number | null): number {
    if (!nearestSignalFrequency) return 0.9;

    const distance = Math.abs(targetFrequency - nearestSignalFrequency);

    // Signal is clear when exactly on frequency
    if (distance < 0.01) return 0.1;

    // Static increases with distance from signal
    return Math.min(0.9, 0.1 + distance * 0.3);
  }
}

export const frequencyManager = new FrequencyManager();
