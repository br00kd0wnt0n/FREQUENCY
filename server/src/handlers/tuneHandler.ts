import { Socket } from 'socket.io';
import { frequencyManager } from '../services/FrequencyManager';
import { TunePayload, TunedEvent, SocketEvents } from '@frequency/shared';

export async function handleTune(socket: Socket, payload: TunePayload): Promise<void> {
  try {
    const { frequency } = payload;
    const userId = socket.data.userId;

    // Get frequency info
    const info = await frequencyManager.getFrequencyInfo(frequency);

    if (!info) {
      // No signal at this frequency - pure static
      const tunedEvent: TunedEvent = {
        frequency,
        broadcastType: 'static',
        staticLevel: 0.9,
      };
      socket.emit(SocketEvents.TUNED, tunedEvent);
      return;
    }

    const tunedEvent: TunedEvent = {
      frequency,
      broadcastType: info.frequency.broadcast_type,
      label: info.frequency.label || undefined,
      characterId: info.character?.id,
      characterCallsign: info.character?.callsign,
      signalId: info.signal?.id,
      signalContent: info.signal?.content_text || undefined,
      signalEncoded: info.signal?.content_encoded || undefined,
      staticLevel: Number(info.frequency.static_level),
    };

    socket.emit(SocketEvents.TUNED, tunedEvent);

    console.log(`User ${userId} tuned to ${frequency}: ${info.frequency.broadcast_type}`);
  } catch (error) {
    console.error('Tune handler error:', error);
    socket.emit(SocketEvents.ERROR, {
      code: 'TUNE_ERROR',
      message: 'Failed to tune frequency',
    });
  }
}
