import { useRef, useCallback, useEffect, useState } from 'react';

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

  // VU meter analyzers
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const vuAnimationRef = useRef<number | null>(null);

  // VU meter levels (0-1)
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);

  // Output gain node for monitoring all audio output
  const masterGainRef = useRef<GainNode | null>(null);

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

    // Connect chain - route through master output if available for VU monitoring
    source.connect(filter);
    filter.connect(gain);

    // Connect to master gain if it exists (for VU meter), otherwise to destination
    if (masterGainRef.current) {
      gain.connect(masterGainRef.current);
    } else {
      gain.connect(ctx.destination);
    }

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

    // Route through master output if available for VU monitoring
    if (masterGainRef.current) {
      gain.connect(masterGainRef.current);
    } else {
      gain.connect(ctx.destination);
    }

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

    // Route through master output if available for VU monitoring
    if (masterGainRef.current) {
      filter.connect(masterGainRef.current);
    } else {
      filter.connect(ctx.destination);
    }

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

    // Route through master output if available for VU monitoring
    if (masterGainRef.current) {
      gainNode.connect(masterGainRef.current);
    } else {
      gainNode.connect(ctx.destination);
    }

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

  // Number words for speech synthesis
  const DIGIT_WORDS: Record<string, string> = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
  };

  // Play numbers station (speech synthesis reading numbers)
  const playNumbers = useCallback((numbers: string, volume: number = 0.4) => {
    initAudioContext();
    stopNumbers();

    // Extract just the digits
    const digits = numbers.split('').filter(d => d >= '0' && d <= '9');

    const speakSequence = () => {
      if (!window.speechSynthesis) return;

      // Build the text: each number spoken individually with pauses
      const text = digits.map(d => DIGIT_WORDS[d] || d).join('. . . ');

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.6;
      utterance.pitch = 0.3;
      utterance.volume = Math.min(1, volume * 2);

      // Try to pick a robotic-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.name.includes('Google') && v.lang.startsWith('en')
      ) || voices.find(v => v.lang.startsWith('en'));
      if (preferredVoice) utterance.voice = preferredVoice;

      window.speechSynthesis.speak(utterance);
    };

    // Voices may not be loaded yet
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        speakSequence();
      };
    } else {
      speakSequence();
    }

    // Loop the numbers with gap
    const estimatedDuration = digits.length * 1200 + 3000;
    numbersIntervalRef.current = window.setInterval(speakSequence, estimatedDuration);
  }, [initAudioContext]);

  const stopNumbers = useCallback(() => {
    if (numbersIntervalRef.current) {
      clearInterval(numbersIntervalRef.current);
      numbersIntervalRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Stop all signal audio
  const stopSignalAudio = useCallback(() => {
    stopMorse();
    stopNumbers();
  }, [stopMorse, stopNumbers]);

  // VU meter animation loop
  const updateVuMeters = useCallback(() => {
    // Input level (microphone)
    if (inputAnalyserRef.current) {
      const dataArray = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
      inputAnalyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setInputLevel(Math.min(1, average / 128)); // Normalize to 0-1
    } else {
      setInputLevel(0);
    }

    // Output level (speaker)
    if (outputAnalyserRef.current) {
      const dataArray = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
      outputAnalyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setOutputLevel(Math.min(1, average / 128)); // Normalize to 0-1
    } else {
      setOutputLevel(0);
    }

    vuAnimationRef.current = requestAnimationFrame(updateVuMeters);
  }, []);

  // Start VU meter monitoring
  const startVuMonitoring = useCallback(() => {
    if (vuAnimationRef.current) return; // Already running
    updateVuMeters();
  }, [updateVuMeters]);

  // Stop VU meter monitoring
  const stopVuMonitoring = useCallback(() => {
    if (vuAnimationRef.current) {
      cancelAnimationFrame(vuAnimationRef.current);
      vuAnimationRef.current = null;
    }
    setInputLevel(0);
    setOutputLevel(0);
  }, []);

  // Start input (microphone) monitoring for VU meter
  const startInputMonitoring = useCallback(async () => {
    const ctx = initAudioContext();

    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Create source from mic
      const source = ctx.createMediaStreamSource(stream);
      micSourceRef.current = source;

      // Create analyser for input level
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      inputAnalyserRef.current = analyser;

      // Connect mic to analyser (but not to output - we don't want feedback)
      source.connect(analyser);

      // Start the VU animation if not already running
      startVuMonitoring();
    } catch (err) {
      console.error('Failed to access microphone for VU meter:', err);
    }
  }, [initAudioContext, startVuMonitoring]);

  // Stop input monitoring
  const stopInputMonitoring = useCallback(() => {
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (inputAnalyserRef.current) {
      inputAnalyserRef.current.disconnect();
      inputAnalyserRef.current = null;
    }
    setInputLevel(0);
  }, []);

  // Start output monitoring for VU meter
  const startOutputMonitoring = useCallback(() => {
    const ctx = initAudioContext();

    // Create analyser for output level
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    outputAnalyserRef.current = analyser;

    // Create master gain if not exists
    if (!masterGainRef.current) {
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.gain.value = 1;
    }

    // Connect master gain through analyser to destination
    masterGainRef.current.connect(analyser);
    analyser.connect(ctx.destination);

    // Start the VU animation if not already running
    startVuMonitoring();

    // Return the master gain node for other audio to connect to
    return masterGainRef.current;
  }, [initAudioContext, startVuMonitoring]);

  // Stop output monitoring
  const stopOutputMonitoring = useCallback(() => {
    if (outputAnalyserRef.current) {
      outputAnalyserRef.current.disconnect();
      outputAnalyserRef.current = null;
    }
    setOutputLevel(0);
  }, []);

  // Get the master output node (for connecting audio sources to monitored output)
  const getMasterOutput = useCallback(() => {
    if (masterGainRef.current) {
      return masterGainRef.current;
    }
    // If no master output yet, connect directly to destination
    const ctx = initAudioContext();
    return ctx.destination;
  }, [initAudioContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStatic();
      stopSignalAudio();
      stopVuMonitoring();
      stopInputMonitoring();
      stopOutputMonitoring();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopStatic, stopSignalAudio, stopVuMonitoring, stopInputMonitoring, stopOutputMonitoring]);

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
    // VU meter functions and state
    inputLevel,
    outputLevel,
    startInputMonitoring,
    stopInputMonitoring,
    startOutputMonitoring,
    stopOutputMonitoring,
    getMasterOutput,
  };
}
