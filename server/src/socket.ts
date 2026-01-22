import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { SocketEvents, ConnectPayload } from '@frequency/shared';
import { handleConnection, handleDisconnect } from './handlers/connectionHandler';
import { handleTune } from './handlers/tuneHandler';
import { handleScan, handleStopScan, cleanupScan } from './handlers/scanHandler';
import { handlePTTStart, handlePTTEnd } from './handlers/pttHandler';
import { handleNotebookAdd, handleNotebookUpdate, handleNotebookDelete } from './handlers/notebookHandler';

export function setupSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
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

    // Disconnect
    socket.on('disconnect', async () => {
      cleanupScan(socket.id);
      await handleDisconnect(socket);
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}
