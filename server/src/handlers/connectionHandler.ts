import { Socket } from 'socket.io';
import { query, queryOne } from '../config/database';
import { frequencyManager } from '../services/FrequencyManager';
import { narrativeEngine } from '../services/NarrativeEngine';
import { User, NotebookEntry, ConnectedEvent, SocketEvents } from '@frequency/shared';
import { v4 as uuidv4 } from 'uuid';

export async function handleConnection(socket: Socket, userId?: string): Promise<void> {
  try {
    let user: User;

    if (userId) {
      // Returning user
      const existing = await queryOne<User>(
        `SELECT * FROM users WHERE id = $1`,
        [userId]
      );

      if (existing) {
        user = existing;
        await query(
          `UPDATE users SET last_session = NOW(), session_count = session_count + 1 WHERE id = $1`,
          [userId]
        );
      } else {
        // User ID provided but not found, create new
        const result = await query<User>(
          `INSERT INTO users (id) VALUES ($1) RETURNING *`,
          [userId]
        );
        if (!result[0]) {
          throw new Error('Failed to create user');
        }
        user = result[0];
      }
    } else {
      // New user
      const result = await query<User>(
        `INSERT INTO users DEFAULT VALUES RETURNING *`
      );
      if (!result[0]) {
        throw new Error('Failed to create user');
      }
      user = result[0];
    }

    // Get frequency map for this user
    const frequencyMap = await frequencyManager.getFrequencyMap(user.id);

    // Get notebook entries
    const notebookEntries = await query<NotebookEntry>(
      `SELECT * FROM notebook_entries WHERE user_id = $1 ORDER BY is_pinned DESC, updated_at DESC`,
      [user.id]
    );

    // Get narrative state
    const narrativeState = await narrativeEngine.getUserFlags(user.id);

    // Store user ID in socket data
    socket.data.userId = user.id;
    socket.data.sessionId = uuidv4();

    // Send connected event
    const connectedEvent: ConnectedEvent = {
      userId: user.id,
      sessionId: socket.data.sessionId,
      frequencyMap,
      notebookEntries,
      narrativeState,
    };

    socket.emit(SocketEvents.CONNECTED, connectedEvent);

    console.log(`User connected: ${user.id} (session: ${socket.data.sessionId})`);
  } catch (error) {
    console.error('Connection handler error:', error);
    socket.emit(SocketEvents.ERROR, {
      code: 'CONNECTION_ERROR',
      message: 'Failed to establish connection',
    });
  }
}

export async function handleDisconnect(socket: Socket): Promise<void> {
  const userId = socket.data.userId;
  if (userId) {
    console.log(`User disconnected: ${userId}`);
  }
}
