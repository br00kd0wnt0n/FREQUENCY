import { MorseEncoder } from './MorseEncoder';

export interface MorseAudioResult {
  audioBuffer: ArrayBuffer;
  timing: number[];
  duration: number;
}

export interface NumberStationResult {
  audioBuffer: ArrayBuffer;
  duration: number;
}

export class SignalGenerator {
  private morseEncoder: MorseEncoder;

  constructor() {
    this.morseEncoder = new MorseEncoder();
  }

  generateMorse(text: string): { encoded: string; timing: number[] } {
    const encoded = this.morseEncoder.encode(text);
    const timing = this.morseEncoder.getTimings(encoded);

    return {
      encoded,
      timing,
    };
  }

  // TODO: Implement actual audio generation
  async generateMorseAudio(text: string, frequency: number = 700): Promise<MorseAudioResult | null> {
    console.log('MorseAudio generation called - implement audio synthesis');
    // This would use Web Audio API on server or pre-generated audio
    return null;
  }

  async generateNumberStation(content: string, voiceId: string): Promise<NumberStationResult | null> {
    console.log('NumberStation generation called - implement audio synthesis');
    // This would use ElevenLabs to speak numbers
    return null;
  }

  generateRandomNumberSequence(length: number = 7): string {
    const numbers: number[] = [];
    for (let i = 0; i < length; i++) {
      numbers.push(Math.floor(Math.random() * 10));
    }
    return numbers.join('-');
  }
}

export const signalGenerator = new SignalGenerator();
