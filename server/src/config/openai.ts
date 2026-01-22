import dotenv from 'dotenv';

dotenv.config();

export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4-turbo-preview',
  maxTokens: 300,
  temperature: 0.8,
};

// TODO: Implement OpenAI client wrapper
export class OpenAIClient {
  private apiKey: string;

  constructor() {
    this.apiKey = openaiConfig.apiKey;
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured');
    }
  }

  async generateResponse(systemPrompt: string, messages: Array<{ role: string; content: string }>): Promise<string> {
    // TODO: Implement actual OpenAI API call
    console.log('OpenAI generateResponse called - implement API integration');
    return 'This is a placeholder response. OpenAI integration pending.';
  }
}

export const openaiClient = new OpenAIClient();
