import { query, queryOne } from '../config/database';
import { CharacterTrust } from '@frequency/shared';

export class TrustManager {
  async getTrust(userId: string, characterId: string): Promise<CharacterTrust> {
    let trust = await queryOne<CharacterTrust>(
      `SELECT * FROM character_trust WHERE user_id = $1 AND character_id = $2`,
      [userId, characterId]
    );

    if (!trust) {
      const result = await query<CharacterTrust>(
        `INSERT INTO character_trust (user_id, character_id, trust_level, interactions_count)
         VALUES ($1, $2, 0, 0) RETURNING *`,
        [userId, characterId]
      );
      trust = result[0];
    }

    return trust;
  }

  async updateTrust(userId: string, characterId: string, delta: number): Promise<CharacterTrust> {
    const result = await query<CharacterTrust>(
      `UPDATE character_trust
       SET trust_level = GREATEST(-100, LEAST(100, trust_level + $3)),
           interactions_count = interactions_count + 1,
           updated_at = NOW()
       WHERE user_id = $1 AND character_id = $2
       RETURNING *`,
      [userId, characterId, delta]
    );

    return result[0];
  }

  async revealSecret(userId: string, characterId: string, secretIndex: number): Promise<void> {
    await query(
      `UPDATE character_trust
       SET revealed_secrets = revealed_secrets || $3::jsonb
       WHERE user_id = $1 AND character_id = $2`,
      [userId, characterId, JSON.stringify([secretIndex])]
    );
  }

  async getRevealedSecrets(userId: string, characterId: string): Promise<number[]> {
    const trust = await this.getTrust(userId, characterId);
    return trust.revealed_secrets || [];
  }
}
