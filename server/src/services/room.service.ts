import { pool } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface CreateRoomInput {
  name: string;
  language?: string;
  isPublic?: boolean;
  ownerId?: string;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  owner_id?: string;
  language: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RoomParticipant {
  room_id: string;
  user_id: string;
  role: string;
  joined_at: Date;
}

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateRoomCode(length = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return result;
}

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const client = await pool.connect();
  
  try {
    let code = generateRoomCode();
    let exists = true;
    
    // Ensure unique code
    while (exists) {
      const checkResult = await client.query(
        'SELECT 1 FROM rooms WHERE code = $1',
        [code]
      );
      if (checkResult.rows.length === 0) {
        exists = false;
      } else {
        code = generateRoomCode();
      }
    }
    
    const result = await client.query(
      `INSERT INTO rooms (id, name, code, owner_id, language, is_public)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uuidv4(), input.name, code, input.ownerId || null, input.language || 'javascript', input.isPublic ?? true]
    );
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const result = await pool.query(
    'SELECT * FROM rooms WHERE code = $1',
    [code.toUpperCase()]
  );
  
  return result.rows[0] || null;
}

export async function getRoomById(id: string): Promise<Room | null> {
  const result = await pool.query(
    'SELECT * FROM rooms WHERE id = $1',
    [id]
  );
  
  return result.rows[0] || null;
}

export async function getPublicRooms(limit = 20, offset = 0): Promise<Room[]> {
  const result = await pool.query(
    `SELECT r.*, u.username as owner_username
     FROM rooms r
     LEFT JOIN users u ON r.owner_id = u.id
     WHERE r.is_public = true
     ORDER BY r.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  
  return result.rows;
}

export async function addUserToRoom(
  roomId: string,
  userId: string,
  role = 'editor'
): Promise<RoomParticipant> {
  const result = await pool.query(
    `INSERT INTO room_participants (room_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (room_id, user_id) DO UPDATE SET role = $3
     RETURNING *`,
    [roomId, userId, role]
  );
  
  return result.rows[0];
}

export async function removeUserFromRoom(roomId: string, userId: string): Promise<void> {
  await pool.query(
    'DELETE FROM room_participants WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
}

export async function getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
  const result = await pool.query(
    `SELECT rp.*, u.username, u.avatar_url
     FROM room_participants rp
     JOIN users u ON rp.user_id = u.id
     WHERE rp.room_id = $1`,
    [roomId]
  );
  
  return result.rows;
}

export async function getUserRooms(userId: string): Promise<Room[]> {
  const result = await pool.query(
    `SELECT r.*
     FROM rooms r
     JOIN room_participants rp ON r.id = rp.room_id
     WHERE rp.user_id = $1
     ORDER BY rp.joined_at DESC`,
    [userId]
  );
  
  return result.rows;
}

export async function updateRoom(
  id: string,
  updates: { language?: string; isPublic?: boolean }
): Promise<Room | null> {
  const result = await pool.query(
    `UPDATE rooms
     SET language = COALESCE($2, language),
         is_public = COALESCE($3, is_public)
     WHERE id = $1
     RETURNING *`,
    [id, updates.language ?? null, updates.isPublic ?? null]
  );

  return result.rows[0] || null;
}

export async function deleteRoom(roomId: string): Promise<void> {
  await pool.query('DELETE FROM rooms WHERE id = $1', [roomId]);
}
