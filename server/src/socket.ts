import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { SocketEvents, ConnectPayload } from '@frequency/shared';
import { handleConnection, handleDisconnect } from './handlers/connectionHandler';
import { handleTune } from './handlers/tuneHandler';
import { handleScan, handleStopScan, cleanupScan } from './handlers/scanHandler';
import { handlePTTStart, handlePTTEnd } from './handlers/pttHandler';
import { handleNotebookAdd, handleNotebookUpdate, handleNotebookDelete } from './handlers/notebookHandler';
import { query } from './config/database';

export function setupSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: true, // Allow all origins (matches express cors config)
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 5e6, // 5MB - needed for audio data
  });

  io.on('connection', async (socket: Socket) => {
    console.log('Socket connected:', socket.id);

    // Track auto-connect timer so we can cancel it
    let autoConnectTimer: ReturnType<typeof setTimeout> | null = null;

    // Handle initial connection with optional user ID
    socket.on(SocketEvents.CONNECT, async (payload: ConnectPayload) => {
      // Cancel auto-connect if explicit connect arrives first
      if (autoConnectTimer) {
        clearTimeout(autoConnectTimer);
        autoConnectTimer = null;
      }
      // Only connect once per socket
      if (socket.data.userId) return;
      try {
        await handleConnection(socket, payload.userId);
      } catch (error) {
        console.error('Connection handler error:', error);
        socket.emit(SocketEvents.ERROR, { code: 'CONNECTION_ERROR', message: 'Failed to establish connection' });
      }
    });

    // Auto-connect if no explicit connect event (for simplicity)
    autoConnectTimer = setTimeout(async () => {
      autoConnectTimer = null;
      if (!socket.data.userId) {
        try {
          await handleConnection(socket);
        } catch (error) {
          console.error('Auto-connect error:', error);
          socket.emit(SocketEvents.ERROR, { code: 'CONNECTION_ERROR', message: 'Failed to establish connection' });
        }
      }
    }, 1000);

    // Tuning
    socket.on(SocketEvents.TUNE, async (payload) => {
      try {
        await handleTune(socket, payload);
      } catch (error) {
        console.error('Tune handler error:', error);
      }
    });

    // Scanning
    socket.on(SocketEvents.SCAN, async (payload) => {
      try {
        await handleScan(socket, payload);
      } catch (error) {
        console.error('Scan handler error:', error);
      }
    });

    socket.on(SocketEvents.STOP_SCAN, () => {
      handleStopScan(socket);
    });

    // Push-to-talk
    socket.on(SocketEvents.PTT_START, async (payload) => {
      try {
        await handlePTTStart(socket, payload);
      } catch (error) {
        console.error('PTT start handler error:', error);
      }
    });

    socket.on(SocketEvents.PTT_END, async (payload) => {
      try {
        await handlePTTEnd(socket, payload);
      } catch (error) {
        console.error('PTT end handler error:', error);
        socket.emit(SocketEvents.ERROR, { code: 'DIALOGUE_ERROR', message: 'Failed to process voice message' });
      }
    });

    // Notebook
    socket.on(SocketEvents.NOTEBOOK_ADD, async (payload) => {
      try {
        await handleNotebookAdd(socket, payload);
      } catch (error) {
        console.error('Notebook add handler error:', error);
      }
    });

    socket.on(SocketEvents.NOTEBOOK_UPDATE, async (payload) => {
      try {
        await handleNotebookUpdate(socket, payload);
      } catch (error) {
        console.error('Notebook update handler error:', error);
      }
    });

    socket.on(SocketEvents.NOTEBOOK_DELETE, async (payload) => {
      try {
        await handleNotebookDelete(socket, payload);
      } catch (error) {
        console.error('Notebook delete handler error:', error);
      }
    });

    // Reset conversation history
    socket.on('reset_conversations', async () => {
      const userId = socket.data.userId;
      if (!userId) return;
      try {
        // Delete messages for all of this user's conversations
        await query(
          `DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = $1)`,
          [userId]
        );
        // Delete the conversations themselves
        await query(`DELETE FROM conversations WHERE user_id = $1`, [userId]);
        // Reset trust levels
        await query(`DELETE FROM character_trust WHERE user_id = $1`, [userId]);
        console.log(`Reset all conversations for user ${userId}`);
        socket.emit('conversations_reset', { success: true });
      } catch (error) {
        console.error('Failed to reset conversations:', error);
        socket.emit(SocketEvents.ERROR, { code: 'RESET_ERROR', message: 'Failed to reset conversations' });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      // Cancel auto-connect timer if socket disconnects before it fires
      if (autoConnectTimer) {
        clearTimeout(autoConnectTimer);
        autoConnectTimer = null;
      }
      cleanupScan(socket.id);
      // Clear active PTT on disconnect
      socket.data.activePTT = null;
      try {
        await handleDisconnect(socket);
      } catch (error) {
        console.error('Disconnect handler error:', error);
      }
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}
