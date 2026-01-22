import { useState, useRef, useCallback } from 'react';

interface UsePTTOptions {
  onStart?: () => void;
  onEnd?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function usePTT({ onStart, onEnd, onError }: UsePTTOptions = {}) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef('');

  const startPTT = useCallback(() => {
    if (isActive) return;

    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onError?.('Speech recognition not supported');
      return;
    }

    setIsActive(true);
    transcriptRef.current = '';
    onStart?.();

    // Setup speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }
      if (finalTranscript) {
        transcriptRef.current += finalTranscript;
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'aborted') {
        onError?.(event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsActive(false);
      onError?.('Failed to start speech recognition');
    }
  }, [isActive, onStart, onError]);

  const stopPTT = useCallback(() => {
    if (!isActive) return;

    setIsActive(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Small delay to ensure final transcript is captured
    setTimeout(() => {
      const transcript = transcriptRef.current.trim();
      onEnd?.(transcript);
    }, 100);
  }, [isActive, onEnd]);

  return {
    isActive,
    isListening,
    startPTT,
    stopPTT,
  };
}

// Type declarations for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
