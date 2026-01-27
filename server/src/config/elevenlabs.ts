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

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
}

export class ElevenLabsClient {
  private apiKey: string;

  constructor() {
    this.apiKey = elevenlabsConfig.apiKey;
    if (!this.apiKey) {
      console.warn('ElevenLabs API key not configured - character audio will be text-only');
    }
  }

  async synthesize(text: string, voiceId: string): Promise<Buffer | null> {
    if (!this.apiKey) {
      return null;
    }

    // Skip placeholder voice IDs
    if (voiceId.startsWith('placeholder_')) {
      console.warn(`Placeholder voice ID detected: ${voiceId}. Set real ElevenLabs voice IDs in database.`);
      return null;
    }

    try {
      const response = await fetch(
        `${elevenlabsConfig.baseUrl}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: elevenlabsConfig.defaultVoiceSettings,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('ElevenLabs API error:', response.status, error);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('ElevenLabs synthesis error:', error);
      return null;
    }
  }

  async getVoices(): Promise<Voice[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${elevenlabsConfig.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        console.error('ElevenLabs voices error:', response.status);
        return [];
      }

      const data = await response.json() as { voices?: Voice[] };
      return data.voices || [];
    } catch (error) {
      console.error('ElevenLabs getVoices error:', error);
      return [];
    }
  }
}

export const elevenlabsClient = new ElevenLabsClient();
