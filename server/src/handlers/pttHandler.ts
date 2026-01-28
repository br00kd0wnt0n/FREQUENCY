import { Socket } from 'socket.io';
import { dialogueEngine } from '../services/DialogueEngine';
import { frequencyManager } from '../services/FrequencyManager';
import { narrativeEngine } from '../services/NarrativeEngine';
import { openaiClient } from '../config/openai';
import {
  PTTStartPayload,
  PTTEndPayload,
  CharacterThinkingEvent,
  CharacterAudioEvent,
  NarrativeUpdateEvent,
  SocketEvents,
} from '@frequency/shared';

export async function handlePTTStart(socket: Socket, payload: PTTStartPayload): Promise<void> {
  const { frequency } = payload;
  const userId = socket.data.userId;

  // Get frequency info to see if there's a character listening
  const info = await frequencyManager.getFrequencyInfo(frequency);

  if (!info || !info.character) {
    // No one to talk to at this frequency
    return;
  }

  // Store active conversation context
  socket.data.activePTT = {
    frequency,
    characterId: info.character.id,
    startTime: Date.now(),
  };

  console.log(`User ${userId} PTT start on ${frequency} (${info.character.callsign})`);
}

export async function handlePTTEnd(socket: Socket, payload: PTTEndPayload): Promise<void> {
  const { frequency, transcript: providedTranscript, audioBase64 } = payload;
  const userId = socket.data.userId;

  let transcript = providedTranscript || '';

  console.log(`User ${userId} PTT end - transcript: "${transcript.substring(0, 50)}", audioBase64: ${audioBase64 ? `${audioBase64.length} chars` : 'none'}`);

  // If no transcript but we have audio, transcribe it server-side with Whisper
  if (!transcript.trim() && audioBase64) {
    console.log(`User ${userId} PTT end - transcribing ${audioBase64.length} chars of audio with Whisper...`);
    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      transcript = await openaiClient.transcribeAudio(audioBuffer, 'audio.webm');
      console.log(`Whisper transcription: "${transcript}"`);

      // Send transcript back to client for display
      socket.emit('transcription', { transcript });
    } catch (error) {
      console.error('Whisper transcription failed:', error);
    }
  }

  if (!transcript || transcript.trim().length === 0) {
    console.log(`User ${userId} PTT end with no transcript`);
    return;
  }

  // Get frequency info
  const info = await frequencyManager.getFrequencyInfo(frequency);

  if (!info || !info.character) {
    socket.emit(SocketEvents.ERROR, {
      code: 'NO_CHARACTER',
      message: 'No one is listening on this frequency',
    });
    return;
  }

  const characterId = info.character.id;

  // Emit thinking state
  const thinkingEvent: CharacterThinkingEvent = {
    characterId,
    isThinking: true,
  };
  socket.emit(SocketEvents.CHARACTER_THINKING, thinkingEvent);

  try {
    // Process the message through dialogue engine
    const response = await dialogueEngine.processUserMessage(
      userId,
      characterId,
      transcript
    );

    // Stop thinking
    socket.emit(SocketEvents.CHARACTER_THINKING, {
      characterId,
      isThinking: false,
    });

    // Send character audio response
    const audioEvent: CharacterAudioEvent = {
      characterId,
      audioBase64: response.audioBuffer?.toString('base64'),
      transcript: response.text,
      duration: 3000, // TODO: Calculate actual duration
    };
    socket.emit(SocketEvents.CHARACTER_AUDIO, audioEvent);

    // Check for narrative updates
    const narrativeUpdates = await narrativeEngine.checkTriggers(userId, { characterId });

    for (const update of narrativeUpdates) {
      const narrativeEvent: NarrativeUpdateEvent = update;
      socket.emit(SocketEvents.NARRATIVE_UPDATE, narrativeEvent);
    }

    // Also emit any flags from dialogue response
    for (const flag of response.narrativeFlags) {
      await narrativeEngine.setFlag(userId, flag, 'character', characterId);
      socket.emit(SocketEvents.NARRATIVE_UPDATE, {
        flag,
        source: info.character.callsign,
      });
    }

    console.log(`User ${userId} spoke to ${info.character.callsign}: "${transcript.substring(0, 50)}..."`);
  } catch (error) {
    console.error('PTT handler error:', error);

    socket.emit(SocketEvents.CHARACTER_THINKING, {
      characterId,
      isThinking: false,
    });

    socket.emit(SocketEvents.ERROR, {
      code: 'DIALOGUE_ERROR',
      message: 'Failed to process voice message',
    });
  }

  // Clear active PTT
  socket.data.activePTT = null;
}
