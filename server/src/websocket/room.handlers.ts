import { Server, Socket } from 'socket.io';
import { getRoomByCode } from '../services/room.service.js';
import { getUserById } from '../services/user.service.js';

interface RoomUser {
  id: string;             // socket id — stable presence identity for join/leave
  userId: string | null;  // account id (null for anonymous) — used to detect "you"
  username: string;
  color: string;
}

// roomId -> (socketId -> user)
const roomStates = new Map<string, Map<string, RoomUser>>();

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
];

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function setupRoomHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', async ({ roomCode, userId }: { roomCode: string; userId?: string }) => {
      try {
        const room = await getRoomByCode(roomCode);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        let username = 'Anonymous';
        if (userId) {
          const account = await getUserById(userId);
          if (account) username = account.username;
        }

        if (!roomStates.has(room.id)) roomStates.set(room.id, new Map());
        const users = roomStates.get(room.id)!;

        const user: RoomUser = {
          id: socket.id,
          userId: userId || null,
          username,
          color: randomColor(),
        };
        users.set(socket.id, user);

        // Sockets join the Socket.IO room keyed by room.id; remember it so the
        // other handlers (chat, typing, language) can broadcast to the same room.
        socket.data.roomId = room.id;
        await socket.join(room.id);

        // Tell others someone joined, and send the joiner the full roster.
        socket.to(room.id).emit('user-joined', user);
        socket.emit('room-joined', {
          roomId: room.id,
          roomCode: room.code,
          users: Array.from(users.values()),
          color: user.color,
        });

        console.log(`User ${socket.id} joined room ${room.code}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('leave-room', () => leaveRoom(socket));

    // Language changes broadcast to the room the socket actually joined (room.id).
    socket.on('language-change', ({ language }: { language: string }) => {
      const roomId = socket.data.roomId;
      if (roomId) socket.to(roomId).emit('language-change', { userId: socket.id, language });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      leaveRoom(socket);
    });
  });
}

// Remove the socket from its room's roster and notify everyone else.
function leaveRoom(socket: Socket) {
  const roomId = socket.data.roomId as string | undefined;
  if (!roomId) return;

  const users = roomStates.get(roomId);
  if (users?.delete(socket.id)) {
    socket.to(roomId).emit('user-left', { id: socket.id });
    if (users.size === 0) roomStates.delete(roomId);
  }

  socket.leave(roomId);
  socket.data.roomId = undefined;
}
