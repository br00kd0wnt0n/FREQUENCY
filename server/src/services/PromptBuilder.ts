import { Character, Message } from '@frequency/shared';

export class PromptBuilder {
  buildPrompt(
    character: Character,
    conversationHistory: Message[],
    trustLevel: number,
    narrativeState: string[],
    userMessage: string
  ): string {
    return `${character.personality_prompt}

## Your Knowledge
${this.filterKnowledgeByTrust(character.knowledge, trustLevel)}

## Your Secrets (reveal only at high trust)
${trustLevel > 70 ? this.formatSecrets(character.secrets) : 'Keep these hidden for now.'}

## Other Characters You Know
${this.formatRelationships(character.relationships)}

## Current Story State
The operator has learned: ${narrativeState.length > 0 ? narrativeState.join(', ') : 'Nothing yet - they are new here.'}

## Conversation So Far
${this.formatHistory(conversationHistory)}

## Speaking Style
${character.speaking_style || 'Natural radio operator style.'}
Remember: You're on a radio. Keep responses relatively brief (1-3 sentences typically).
Use radio language naturally ("copy that", "over", "10-4").
Stay in character at all times.

Operator says: "${userMessage}"

Respond in character:`;
  }

  private filterKnowledgeByTrust(knowledge: Record<string, string>, trustLevel: number): string {
    const entries = Object.entries(knowledge);
    if (entries.length === 0) return 'Standard radio operator knowledge.';

    // At low trust, only reveal basic info
    const accessibleCount = Math.max(1, Math.floor(entries.length * (trustLevel / 100)));
    const accessible = entries.slice(0, accessibleCount);

    return accessible.map(([key, value]) => `- ${key}: ${value}`).join('\n');
  }

  private formatSecrets(secrets: string[]): string {
    if (!secrets || secrets.length === 0) return 'No secrets to reveal.';
    return secrets.map(s => `- ${s}`).join('\n');
  }

  private formatRelationships(relationships: Record<string, string>): string {
    const entries = Object.entries(relationships);
    if (entries.length === 0) return 'You keep to yourself mostly.';
    return entries.map(([name, relation]) => `- ${name}: ${relation}`).join('\n');
  }

  private formatHistory(messages: Message[]): string {
    if (messages.length === 0) return 'This is the start of the conversation.';

    return messages
      .slice(-10) // Last 10 messages for context
      .map(m => `${m.role === 'user' ? 'Operator' : 'You'}: ${m.content}`)
      .join('\n');
  }
}
