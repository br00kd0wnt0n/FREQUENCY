import { useRef, useCallback, useEffect } from 'react';

// Morse code timing (in units, 1 unit = 60ms at 20 WPM)
const MORSE_UNIT = 60;
const MORSE_CODE: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
  '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.', ' ': ' '
};

export function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const staticSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const staticGainRef = useRef<GainNode | null>(null);
  const morseOscillatorRef = useRef<OscillatorNode | null>(null);
  const morseGainRef = useRef<GainNode | null>(null);
  const morseIntervalRef = useRef<number | null>(null);
  const numbersIntervalRef = useRef<number | null>(null);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playStaticNoise = useCallback((level: number) => {
    const ctx = initAudioContext();

    // Stop existing static
    if (staticSourceRef.current) {
      staticSourceRef.current.stop();
      staticSourceRef.current.disconnect();
    }

    // Create noise buffer
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Create source
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Create gain
    const gain = ctx.createGain();
    gain.gain.value = level * 0.3; // Scale down for comfort

    // Create bandpass filter for radio effect
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 0.5;

    // Connect chain
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    staticSourceRef.current = source;
    staticGainRef.current = gain;
  }, [initAudioContext]);

  const setStaticLevel = useCallback((level: number) => {
    if (staticGainRef.current) {
      staticGainRef.current.gain.setValueAtTime(
        level * 0.3,
        audioContextRef.current?.currentTime || 0
      );
    }
  }, []);

  const stopStatic = useCallback(() => {
    if (staticSourceRef.current) {
      staticSourceRef.current.stop();
      staticSourceRef.current.disconnect();
      staticSourceRef.current = null;
    }
  }, []);

  const playSquelch = useCallback(() => {
    const ctx = initAudioContext();

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.1);
  }, [initAudioContext]);

  const playAudioBuffer = useCallback(async (audioData: ArrayBuffer | string) => {
    const ctx = initAudioContext();

    let buffer: ArrayBuffer;
    if (typeof audioData === 'string') {
      if (audioData.startsWith('http://') || audioData.startsWith('https://')) {
        // URL - fetch the audio
        const response = await fetch(audioData);
        buffer = await response.arrayBuffer();
      } else {
        // Base64 encoded
        const binary = atob(audioData);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        buffer = bytes.buffer;
      }
    } else {
      buffer = audioData;
    }

    const audioBuffer = await ctx.decodeAudioData(buffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    // Apply radio filter effect
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;

    source.connect(filter);
    filter.connect(ctx.destination);

    source.start();

    return new Promise<void>((resolve) => {
      source.onended = () => resolve();
    });
  }, [initAudioContext]);

  // Play morse code for a given text
  const playMorse = useCallback((text: string, volume: number = 0.3) => {
    const ctx = initAudioContext();

    // Stop any existing morse
    stopMorse();

    // Create oscillator for morse tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 700; // Classic morse tone

    // Add slight filter for radio effect
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 700;
    filter.Q.value = 10;

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.value = 0; // Start silent
    oscillator.start();

    morseOscillatorRef.current = oscillator;
    morseGainRef.current = gainNode;

    // Convert text to morse timing
    const morse = text.toUpperCase().split('').map(char => MORSE_CODE[char] || '').join(' ');

    let time = ctx.currentTime;
    const unit = MORSE_UNIT / 1000;

    for (const symbol of morse) {
      if (symbol === '.') {
        gainNode.gain.setValueAtTime(volume, time);
        time += unit;
        gainNode.gain.setValueAtTime(0, time);
        time += unit; // Gap between symbols
      } else if (symbol === '-') {
        gainNode.gain.setValueAtTime(volume, time);
        time += unit * 3;
        gainNode.gain.setValueAtTime(0, time);
        time += unit; // Gap between symbols
      } else if (symbol === ' ') {
        time += unit * 2; // Gap between letters (total 3 with previous gap)
      }
    }

    // Loop the morse code
    const totalDuration = (time - ctx.currentTime) * 1000;
    morseIntervalRef.current = window.setInterval(() => {
      if (!morseGainRef.current || !audioContextRef.current) return;

      let loopTime = audioContextRef.current.currentTime;
      for (const symbol of morse) {
        if (symbol === '.') {
          morseGainRef.current.gain.setValueAtTime(volume, loopTime);
          loopTime += unit;
          morseGainRef.current.gain.setValueAtTime(0, loopTime);
          loopTime += unit;
        } else if (symbol === '-') {
          morseGainRef.current.gain.setValueAtTime(volume, loopTime);
          loopTime += unit * 3;
          morseGainRef.current.gain.setValueAtTime(0, loopTime);
          loopTime += unit;
        } else if (symbol === ' ') {
          loopTime += unit * 2;
        }
      }
    }, totalDuration + 2000); // Add 2 second gap between repeats
  }, [initAudioContext]);

  const stopMorse = useCallback(() => {
    if (morseIntervalRef.current) {
      clearInterval(morseIntervalRef.current);
      morseIntervalRef.current = null;
    }
    if (morseOscillatorRef.current) {
      morseOscillatorRef.current.stop();
      morseOscillatorRef.current.disconnect();
      morseOscillatorRef.current = null;
    }
    if (morseGainRef.current) {
      morseGainRef.current.disconnect();
      morseGainRef.current = null;
    }
  }, []);

  // Play numbers station (synthesized voice reading numbers)
  const playNumbers = useCallback((numbers: string, volume: number = 0.4) => {
    // Initialize audio context
    initAudioContext();

    // Stop any existing numbers
    stopNumbers();

    // Create a simple tone-based numbers effect
    // Each number is a different frequency pattern
    const numberFreqs: Record<string, number[]> = {
      '0': [300, 300], '1': [350, 250], '2': [400, 300], '3': [450, 350],
      '4': [500, 400], '5': [550, 450], '6': [600, 500], '7': [650, 550],
      '8': [700, 600], '9': [750, 650], '-': [200, 200]
    };

    const digits = numbers.split('');

    const playSequence = () => {
      if (!audioContextRef.current) return;

      let seqTime = audioContextRef.current.currentTime;

      for (const digit of digits) {
        const freqs = numberFreqs[digit] || [300, 300];

        // Create oscillator for each digit
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        const filter = audioContextRef.current.createBiquadFilter();

        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.value = 1500;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContextRef.current.destination);

        // Two-tone for each digit
        osc.frequency.setValueAtTime(freqs[0], seqTime);
        osc.frequency.setValueAtTime(freqs[1], seqTime + 0.15);

        gain.gain.setValueAtTime(0, seqTime);
        gain.gain.linearRampToValueAtTime(volume, seqTime + 0.05);
        gain.gain.setValueAtTime(volume, seqTime + 0.25);
        gain.gain.linearRampToValueAtTime(0, seqTime + 0.3);

        osc.start(seqTime);
        osc.stop(seqTime + 0.35);

        seqTime += digit === '-' ? 0.5 : 0.4;
      }
    };

    playSequence();

    // Loop the numbers
    const totalDuration = digits.length * 400 + 3000;
    numbersIntervalRef.current = window.setInterval(playSequence, totalDuration);
  }, [initAudioContext]);

  const stopNumbers = useCallback(() => {
    if (numbersIntervalRef.current) {
      clearInterval(numbersIntervalRef.current);
      numbersIntervalRef.current = null;
    }
  }, []);

  // Stop all signal audio
  const stopSignalAudio = useCallback(() => {
    stopMorse();
    stopNumbers();
  }, [stopMorse, stopNumbers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStatic();
      stopSignalAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopStatic, stopSignalAudio]);

  return {
    initAudioContext,
    playStaticNoise,
    setStaticLevel,
    stopStatic,
    playSquelch,
    playAudioBuffer,
    playMorse,
    stopMorse,
    playNumbers,
    stopNumbers,
    stopSignalAudio,
  };
}
