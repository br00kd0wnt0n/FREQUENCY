import { useState, useRef, useCallback } from 'react';

// Type declarations for Speech Recognition API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionConstructor;
    webkitSpeechRecognition?: ISpeechRecognitionConstructor;
  }
}

interface UsePTTOptions {
  onStart?: () => void;
  onEnd?: (transcript: string, audioBase64?: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hybrid PTT hook that:
 * 1. Always records audio with MediaRecorder (reliable)
 * 2. Tries Web Speech API for live transcript feedback (may fail on some browsers/networks)
 * 3. Returns both transcript (if available) and audio data for server-side Whisper transcription
 */
export function usePTT({ onStart, onEnd, onError }: UsePTTOptions = {}) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  // Speech recognition refs
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const transcriptRef = useRef('');
  const speechRecognitionFailed = useRef(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startPTT = useCallback(async () => {
    if (isActive) return;

    setIsActive(true);
    transcriptRef.current = '';
    speechRecognitionFailed.current = false;
    setInterimTranscript('');
    audioChunksRef.current = [];
    onStart?.();

    // 1. Start audio recording (always - this is our reliable backup)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setInterimTranscript('(Microphone access denied)');
        onError?.('Microphone access denied. Please allow microphone access.');
      } else {
        setInterimTranscript('(Microphone unavailable)');
        onError?.('Failed to access microphone');
      }
      setIsActive(false);
      return;
    }

    // 2. Try to start speech recognition for live feedback (optional - may fail)
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          let interim = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interim += transcript;
            }
          }

          if (finalTranscript) {
            transcriptRef.current += finalTranscript;
            setInterimTranscript(transcriptRef.current);
          } else if (interim) {
            setInterimTranscript(transcriptRef.current + interim);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn('Speech recognition error (using server transcription):', event.error);
          speechRecognitionFailed.current = true;

          // Show user-friendly message but don't fail - we have audio backup
          if (event.error === 'network') {
            setInterimTranscript('Recording... (transcription on release)');
          } else if (event.error === 'not-allowed') {
            // This shouldn't happen since we already got mic permission for recording
          } else if (event.error === 'no-speech') {
            setInterimTranscript('(Listening...)');
          }
          // Don't call onError - we have audio recording as backup
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (error) {
        console.warn('Speech recognition not available, using server transcription');
        speechRecognitionFailed.current = true;
        setInterimTranscript('Recording... (transcription on release)');
      }
    } else {
      // No speech recognition available - show recording indicator
      speechRecognitionFailed.current = true;
      setInterimTranscript('Recording... (transcription on release)');
    }
  }, [isActive, onStart, onError]);

  const stopPTT = useCallback(() => {
    if (!isActive) return;

    setIsActive(false);

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);

    // Stop audio recording and get the data
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        // Convert audio chunks to base64
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Stop media stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1]; // Remove data URL prefix

          // Get transcript (might be empty if speech recognition failed)
          const transcript = transcriptRef.current.trim();

          // Call onEnd with transcript and audio
          // If transcript is empty, server will use Whisper to transcribe
          onEnd?.(transcript, base64Data);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    } else {
      // No audio recorded - just return transcript
      const transcript = transcriptRef.current.trim();
      onEnd?.(transcript);
    }
  }, [isActive, onEnd]);

  return {
    isActive,
    isListening,
    interimTranscript,
    startPTT,
    stopPTT,
  };
}
