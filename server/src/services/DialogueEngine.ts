import { query, queryOne } from '../config/database';
import { openaiClient } from '../config/openai';
import { elevenlabsClient } from '../config/elevenlabs';
import { Character, Message, Conversation, CharacterTrust } from '@frequency/shared';
import { PromptBuilder } from './PromptBuilder';
import { TrustManager } from './TrustManager';

export interface CharacterResponse {
  text: string;
  audioBuffer: Buffer | null;
  trustDelta: number;
  narrativeFlags: string[];
}

export class DialogueEngine {
  private promptBuilder: PromptBuilder;
  private trustManager: TrustManager;

  constructor() {
    this.promptBuilder = new PromptBuilder();
    this.trustManager = new TrustManager();
  }

  async processUserMessage(
    userId: string,
    characterId: string,
    userMessage: string
  ): Promise<CharacterResponse> {
    // 1. Load or create conversation
    let conversation = await queryOne<Conversation>(
      `SELECT * FROM conversations WHERE user_id = $1 AND character_id = $2`,
      [userId, characterId]
    );

    if (!conversation) {
      const result = await query<Conversation>(
        `INSERT INTO conversations (user_id, character_id) VALUES ($1, $2) RETURNING *`,
        [userId, characterId]
      );
      conversation = result[0];
    }

    // 2. Load character data
    const character = await queryOne<Character>(
      `SELECT * FROM characters WHERE id = $1`,
      [characterId]
    );

    if (!character) {
      throw new Error('Character not found');
    }

    // 3. Load conversation history
    const history = await query<Message>(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 20`,
      [conversation.id]
    );

    // 4. Get trust level
    const trustData = await this.trustManager.getTrust(userId, characterId);

    // 5. Get narrative state
    const narrativeFlags = await query<{ flag_key: string }>(
      `SELECT flag_key FROM narrative_state WHERE user_id = $1`,
      [userId]
    );
    const flags = narrativeFlags.map(n => n.flag_key);

    // 6. Build prompt
    const prompt = this.promptBuilder.buildPrompt(
      character,
      history,
      trustData.trust_level,
      flags,
      userMessage
    );

    // 7. Get AI response
    const responseText = await openaiClient.generateResponse(
      prompt,
      history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
    );

    // 8. Save user message
    await query(
      `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
      [conversation.id, userMessage]
    );

    // 9. Generate audio
    const audioBuffer = await elevenlabsClient.synthesize(responseText, character.elevenlabs_voice_id);

    // 10. Save character response
    await query(
      `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'character', $2)`,
      [conversation.id, responseText]
    );

    // 11. Update conversation
    await query(
      `UPDATE conversations SET last_message_at = NOW(), message_count = message_count + 2 WHERE id = $1`,
      [conversation.id]
    );

    // 12. Calculate trust change (placeholder logic)
    const trustDelta = this.calculateTrustDelta(userMessage, responseText);
    await this.trustManager.updateTrust(userId, characterId, trustDelta);

    // 13. Check for narrative triggers (placeholder)
    const triggeredFlags = this.checkNarrativeTriggers(responseText, character, flags);

    return {
      text: responseText,
      audioBuffer,
      trustDelta,
      narrativeFlags: triggeredFlags,
    };
  }

  private calculateTrustDelta(userMessage: string, response: string): number {
    // TODO: Implement trust calculation based on conversation
    // For now, small positive increase per interaction
    return 2;
  }

  private checkNarrativeTriggers(response: string, character: Character, existingFlags: string[]): string[] {
    // TODO: Implement narrative trigger detection
    const newFlags: string[] = [];

    // Simple example: first conversation with Helena triggers 'met_helena'
    if (character.callsign === 'NIGHTBIRD' && !existingFlags.includes('met_helena')) {
      newFlags.push('met_helena');
    }

    return newFlags;
  }
}

export const dialogueEngine = new DialogueEngine();
