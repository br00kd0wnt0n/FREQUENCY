import { useState, useCallback } from 'react';
import { socketService } from '../services/socket';
import { useRadioStore } from '../stores/radioStore';
import { useNotebookStore } from '../stores/notebookStore';
import { useNarrativeStore } from '../stores/narrativeStore';
import {
  SocketEvents,
  ConnectedEvent,
  TunedEvent,
  ScanUpdateEvent,
  CharacterAudioEvent,
  CharacterThinkingEvent,
  NarrativeUpdateEvent,
  NotebookSyncEvent,
  ErrorEvent,
} from '@frequency/shared';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscription, setLastTranscription] = useState<string | null>(null);

  const { setTuned, setScanUpdate, setCharacterThinking, setCharacterResponse } = useRadioStore();
  const { setEntries } = useNotebookStore();
  const { setFlags, addFlag, addNotification } = useNarrativeStore();

  const connect = useCallback(() => {
    const storedUserId = localStorage.getItem('frequency_user_id');
    const socket = socketService.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      // Send connect event with user ID
      socket.emit(SocketEvents.CONNECT, { userId: storedUserId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on(SocketEvents.CONNECTED, (data: ConnectedEvent) => {
      setUserId(data.userId);
      localStorage.setItem('frequency_user_id', data.userId);
      setEntries(data.notebookEntries);
      setFlags(data.narrativeState);
    });

    socket.on(SocketEvents.TUNED, (data: TunedEvent) => {
      setTuned(data);
    });

    socket.on(SocketEvents.SCAN_UPDATE, (data: ScanUpdateEvent) => {
      setScanUpdate(data);
    });

    socket.on(SocketEvents.CHARACTER_THINKING, (data: CharacterThinkingEvent) => {
      setCharacterThinking(data.isThinking);
    });

    socket.on(SocketEvents.CHARACTER_AUDIO, (data: CharacterAudioEvent) => {
      setCharacterResponse(data);
    });

    socket.on(SocketEvents.NARRATIVE_UPDATE, (data: NarrativeUpdateEvent) => {
      addFlag(data.flag);
      addNotification(data);
    });

    socket.on(SocketEvents.NOTEBOOK_SYNC, (data: NotebookSyncEvent) => {
      setEntries(data.entries);
    });

    socket.on(SocketEvents.ERROR, (data: ErrorEvent) => {
      // Only log real errors, not expected "no character" when scanning
      if (data.code !== 'NO_CHARACTER') {
        setError(data.message);
        console.error('Socket error:', data);
      }
    });

    // Listen for server-side transcription (from Whisper)
    socket.on('transcription', (data: { transcript: string }) => {
      console.log('Received Whisper transcription:', data.transcript);
      setLastTranscription(data.transcript);
    });

    return () => {
      socketService.disconnect();
    };
  }, [setTuned, setScanUpdate, setCharacterThinking, setCharacterResponse, setEntries, setFlags, addFlag, addNotification]);

  const tune = useCallback((frequency: number) => {
    socketService.emit(SocketEvents.TUNE, { frequency });
  }, []);

  const startScan = useCallback((direction: 'up' | 'down', speed: 'slow' | 'fast' = 'slow') => {
    socketService.emit(SocketEvents.SCAN, { direction, speed });
  }, []);

  const stopScan = useCallback(() => {
    socketService.emit(SocketEvents.STOP_SCAN, {});
  }, []);

  const pttStart = useCallback((frequency: number) => {
    socketService.emit(SocketEvents.PTT_START, { frequency });
  }, []);

  const pttEnd = useCallback((frequency: number, transcript: string, audioBase64?: string) => {
    socketService.emit(SocketEvents.PTT_END, { frequency, transcript, audioBase64 });
  }, []);

  const clearTranscription = useCallback(() => {
    setLastTranscription(null);
  }, []);

  return {
    isConnected,
    userId,
    error,
    lastTranscription,
    connect,
    tune,
    startScan,
    stopScan,
    pttStart,
    pttEnd,
    clearTranscription,
  };
}
