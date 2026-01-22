import { Socket } from 'socket.io';
import { query, queryOne } from '../config/database';
import {
  NotebookEntry,
  NotebookAddPayload,
  NotebookUpdatePayload,
  NotebookDeletePayload,
  NotebookSyncEvent,
  SocketEvents,
} from '@frequency/shared';

export async function handleNotebookAdd(socket: Socket, payload: NotebookAddPayload): Promise<void> {
  const userId = socket.data.userId;

  try {
    const result = await query<NotebookEntry>(
      `INSERT INTO notebook_entries (user_id, entry_type, title, content, frequency_ref, character_ref, signal_ref)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        payload.entryType,
        payload.title || null,
        payload.content,
        payload.frequencyRef || null,
        payload.characterRef || null,
        payload.signalRef || null,
      ]
    );

    // Sync all entries back to client
    await syncNotebook(socket, userId);

    console.log(`User ${userId} added notebook entry: ${payload.entryType}`);
  } catch (error) {
    console.error('Notebook add error:', error);
    socket.emit(SocketEvents.ERROR, {
      code: 'NOTEBOOK_ADD_ERROR',
      message: 'Failed to add notebook entry',
    });
  }
}

export async function handleNotebookUpdate(socket: Socket, payload: NotebookUpdatePayload): Promise<void> {
  const userId = socket.data.userId;

  try {
    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (payload.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(payload.title);
    }
    if (payload.content !== undefined) {
      updates.push(`content = $${paramCount++}`);
      values.push(payload.content);
    }
    if (payload.isPinned !== undefined) {
      updates.push(`is_pinned = $${paramCount++}`);
      values.push(payload.isPinned);
    }
    if (payload.tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(JSON.stringify(payload.tags));
    }

    updates.push(`updated_at = NOW()`);

    values.push(payload.entryId);
    values.push(userId);

    await query(
      `UPDATE notebook_entries
       SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount}`,
      values
    );

    await syncNotebook(socket, userId);

    console.log(`User ${userId} updated notebook entry: ${payload.entryId}`);
  } catch (error) {
    console.error('Notebook update error:', error);
    socket.emit(SocketEvents.ERROR, {
      code: 'NOTEBOOK_UPDATE_ERROR',
      message: 'Failed to update notebook entry',
    });
  }
}

export async function handleNotebookDelete(socket: Socket, payload: NotebookDeletePayload): Promise<void> {
  const userId = socket.data.userId;

  try {
    await query(
      `DELETE FROM notebook_entries WHERE id = $1 AND user_id = $2`,
      [payload.entryId, userId]
    );

    await syncNotebook(socket, userId);

    console.log(`User ${userId} deleted notebook entry: ${payload.entryId}`);
  } catch (error) {
    console.error('Notebook delete error:', error);
    socket.emit(SocketEvents.ERROR, {
      code: 'NOTEBOOK_DELETE_ERROR',
      message: 'Failed to delete notebook entry',
    });
  }
}

async function syncNotebook(socket: Socket, userId: string): Promise<void> {
  const entries = await query<NotebookEntry>(
    `SELECT * FROM notebook_entries WHERE user_id = $1 ORDER BY is_pinned DESC, updated_at DESC`,
    [userId]
  );

  const syncEvent: NotebookSyncEvent = { entries };
  socket.emit(SocketEvents.NOTEBOOK_SYNC, syncEvent);
}
