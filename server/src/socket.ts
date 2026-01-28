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

    // Handle initial connection with optional user ID
    socket.on(SocketEvents.CONNECT, async (payload: ConnectPayload) => {
      await handleConnection(socket, payload.userId);
    });

    // Auto-connect if no explicit connect event (for simplicity)
    // Wait a moment for client to send connect event, otherwise auto-connect
    setTimeout(async () => {
      if (!socket.data.userId) {
        await handleConnection(socket);
      }
    }, 1000);

    // Tuning
    socket.on(SocketEvents.TUNE, async (payload) => {
      await handleTune(socket, payload);
    });

    // Scanning
    socket.on(SocketEvents.SCAN, async (payload) => {
      await handleScan(socket, payload);
    });

    socket.on(SocketEvents.STOP_SCAN, () => {
      handleStopScan(socket);
    });

    // Push-to-talk
    socket.on(SocketEvents.PTT_START, async (payload) => {
      await handlePTTStart(socket, payload);
    });

    socket.on(SocketEvents.PTT_END, async (payload) => {
      await handlePTTEnd(socket, payload);
    });

    // Notebook
    socket.on(SocketEvents.NOTEBOOK_ADD, async (payload) => {
      await handleNotebookAdd(socket, payload);
    });

    socket.on(SocketEvents.NOTEBOOK_UPDATE, async (payload) => {
      await handleNotebookUpdate(socket, payload);
    });

    socket.on(SocketEvents.NOTEBOOK_DELETE, async (payload) => {
      await handleNotebookDelete(socket, payload);
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
      cleanupScan(socket.id);
      await handleDisconnect(socket);
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}
