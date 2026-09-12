import { Server, Socket } from 'socket.io';
import { pool } from '../db/index.js';
import { getRoomByCode } from '../services/room.service.js';
import { v4 as uuidv4 } from 'uuid';

export function setupChatHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    // Send chat message
    socket.on('chat-message', async ({ roomCode, content, userId, username }: {
      roomCode: string;
      content: string;
      userId?: string;
      username?: string;
    }) => {
      try {
        if (!content || content.trim().length === 0) return;

        const room = await getRoomByCode(roomCode);
        if (!room) return;

        const result = await pool.query(
          `INSERT INTO chat_messages (id, room_id, user_id, content)
           VALUES ($1, $2, $3, $4)
           RETURNING id, created_at`,
          [uuidv4(), room.id, userId || null, content]
        );

        // Sockets join by room.id (not code), so broadcast there.
        io.to(room.id).emit('chat-message', {
          id: result.rows[0].id,
          content,
          userId: userId || socket.id,
          username: username || 'Anonymous',
          createdAt: result.rows[0].created_at,
        });
      } catch (error) {
        console.error('Chat message error:', error);
      }
    });

    // Get chat history
    socket.on('get-chat-history', async ({ roomCode, limit = 50 }: { roomCode: string; limit?: number }) => {
      try {
        const room = await getRoomByCode(roomCode);
        if (!room) {
          socket.emit('chat-history', { messages: [] });
          return;
        }

        const result = await pool.query(
          `SELECT cm.id, cm.content, cm.user_id, cm.created_at,
                  u.username, u.avatar_url
           FROM chat_messages cm
           LEFT JOIN users u ON cm.user_id = u.id
           WHERE cm.room_id = $1
           ORDER BY cm.created_at DESC
           LIMIT $2`,
          [room.id, limit]
        );

        const messages = result.rows.reverse().map(row => ({
          id: row.id,
          content: row.content,
          userId: row.user_id || 'anonymous',
          username: row.username || 'Anonymous',
          avatarUrl: row.avatar_url,
          createdAt: row.created_at,
        }));

        socket.emit('chat-history', { messages });
      } catch (error) {
        console.error('Get chat history error:', error);
        socket.emit('chat-history', { messages: [] });
      }
    });

    // Typing indicators — broadcast to the room the socket joined (room.id).
    socket.on('typing', ({ userId, username }: { userId?: string; username?: string }) => {
      const roomId = socket.data.roomId;
      if (roomId) socket.to(roomId).emit('user-typing', { userId, username });
    });

    socket.on('stop-typing', ({ userId, username }: { userId?: string; username?: string }) => {
      const roomId = socket.data.roomId;
      if (roomId) socket.to(roomId).emit('user-stop-typing', { userId, username });
    });
  });
}
