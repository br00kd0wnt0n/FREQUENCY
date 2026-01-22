import dotenv from 'dotenv';

dotenv.config();

export const elevenlabsConfig = {
  apiKey: process.env.ELEVENLABS_API_KEY || '',
  baseUrl: 'https://api.elevenlabs.io/v1',
  defaultVoiceSettings: {
    stability: 0.5,
    similarity_boost: 0.75,
  },
};

// TODO: Implement ElevenLabs client wrapper
export class ElevenLabsClient {
  private apiKey: string;

  constructor() {
    this.apiKey = elevenlabsConfig.apiKey;
    if (!this.apiKey) {
      console.warn('ElevenLabs API key not configured');
    }
  }

  async synthesize(text: string, voiceId: string): Promise<Buffer | null> {
    // TODO: Implement actual ElevenLabs API call
    console.log('ElevenLabs synthesize called - implement API integration');
    return null;
  }

  async getVoices(): Promise<unknown[]> {
    // TODO: Implement voice listing
    return [];
  }
}

export const elevenlabsClient = new ElevenLabsClient();
