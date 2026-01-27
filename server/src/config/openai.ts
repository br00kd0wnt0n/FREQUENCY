import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  maxTokens: 300,
  temperature: 0.8,
};

export class OpenAIClient {
  private client: OpenAI | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = openaiConfig.apiKey;
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured - character dialog will use fallback responses');
    } else {
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
  }

  async generateResponse(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<string> {
    if (!this.client) {
      // Fallback response when API not configured
      return this.getFallbackResponse();
    }

    try {
      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const response = await this.client.chat.completions.create({
        model: openaiConfig.model,
        messages: chatMessages,
        max_tokens: openaiConfig.maxTokens,
        temperature: openaiConfig.temperature,
      });

      return response.choices[0]?.message?.content || this.getFallbackResponse();
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.getFallbackResponse();
    }
  }

  private getFallbackResponse(): string {
    const fallbacks = [
      "*static crackles* ...copy that, but you're breaking up. Say again?",
      "*interference* ...didn't quite catch that. The signal's rough tonight.",
      "*static* ...roger, standing by. Try again when the band clears.",
      "*crackle* ...you there? Having trouble with the reception.",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

export const openaiClient = new OpenAIClient();
