import { Router } from 'express';
import {
  createRoom,
  getRoomByCode,
  getRoomById,
  getPublicRooms,
  getUserRooms,
  addUserToRoom,
  removeUserFromRoom,
  updateRoom,
  deleteRoom,
} from '../services/room.service.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

const router = Router();

// Get all public rooms
router.get('/', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const rooms = await getPublicRooms(limit, offset);
  res.json({ rooms });
}));

// Get room by code
router.get('/:code', asyncHandler(async (req, res) => {
  const room = await getRoomByCode(req.params.code);
  if (!room) {
    throw new HttpError(404, 'Room not found');
  }
  res.json({ room });
}));

// Create room (requires auth)
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, language, isPublic } = req.body;
  if (!name) {
    throw new HttpError(400, 'Room name is required');
  }

  const room = await createRoom({
    name,
    language: language || 'javascript',
    isPublic: isPublic ?? true,
    ownerId: req.user!.id,
  });
  await addUserToRoom(room.id, req.user!.id, 'owner');

  res.status(201).json({ room });
}));

// Join room (requires auth)
router.post('/:code/join', authenticate, asyncHandler(async (req, res) => {
  const room = await getRoomByCode(req.params.code);
  if (!room) {
    throw new HttpError(404, 'Room not found');
  }
  await addUserToRoom(room.id, req.user!.id);
  res.json({ room });
}));

// Leave room (requires auth)
router.post('/:code/leave', authenticate, asyncHandler(async (req, res) => {
  const room = await getRoomByCode(req.params.code);
  if (!room) {
    throw new HttpError(404, 'Room not found');
  }
  await removeUserFromRoom(room.id, req.user!.id);
  res.json({ message: 'Left room successfully' });
}));

// Get user's rooms (requires auth)
router.get('/user/my-rooms', authenticate, asyncHandler(async (req, res) => {
  const rooms = await getUserRooms(req.user!.id);
  res.json({ rooms });
}));

// Delete room (requires auth, owner only)
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const room = await getRoomById(req.params.id);
  if (!room) {
    throw new HttpError(404, 'Room not found');
  }
  if (room.owner_id !== req.user!.id) {
    throw new HttpError(403, 'Only room owner can delete the room');
  }
  await deleteRoom(room.id);
  res.json({ message: 'Room deleted successfully' });
}));

// Update room settings (requires auth, owner only)
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const room = await getRoomById(req.params.id);
  if (!room) {
    throw new HttpError(404, 'Room not found');
  }
  if (room.owner_id !== req.user!.id) {
    throw new HttpError(403, 'Only room owner can update the room');
  }
  const { language, visibility } = req.body;
  const updated = await updateRoom(room.id, {
    language,
    isPublic: visibility === undefined ? undefined : visibility === 'public',
  });
  res.json({ room: updated });
}));

export default router;
