import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderOptions {
  onStart?: () => void;
  onEnd?: (audioBase64: string, duration: number) => void;
  onError?: (error: string) => void;
}

export function useAudioRecorder({ onStart, onEnd, onError }: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      // Create MediaRecorder with webm format (widely supported)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const duration = Date.now() - startTimeRef.current;
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix to get just the base64 data
          const base64Data = base64.split(',')[1];
          onEnd?.(base64Data, duration);
        };
        reader.readAsDataURL(audioBlob);

        // Cleanup stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = () => {
        onError?.('Recording error');
        setIsRecording(false);
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      onStart?.();
    } catch (error) {
      console.error('Failed to start recording:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        onError?.('Microphone access denied. Please allow microphone access.');
      } else {
        onError?.('Failed to access microphone');
      }
    }
  }, [isRecording, onStart, onEnd, onError]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, [isRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
