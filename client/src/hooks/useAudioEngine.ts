import { useRef, useCallback, useEffect } from 'react';

export function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const staticSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const staticGainRef = useRef<GainNode | null>(null);

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
      // Base64 encoded
      const binary = atob(audioData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      buffer = bytes.buffer;
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStatic();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopStatic]);

  return {
    initAudioContext,
    playStaticNoise,
    setStaticLevel,
    stopStatic,
    playSquelch,
    playAudioBuffer,
  };
}
