import { Router } from 'express';
import { documentService } from '../services/document.service.js';
import { getRoomByCode } from '../services/room.service.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

const router = Router();

// Room codes are stored uppercase; normalize so a lowercased URL still matches.
const normalizeCode = (code: string) => code.toUpperCase();

// Get all versions for a room
router.get('/:roomCode/versions', asyncHandler(async (req, res) => {
  const versions = await documentService.getVersions(normalizeCode(req.params.roomCode));
  res.json({ versions });
}));

// Get a specific version
router.get('/:roomCode/versions/:versionId', asyncHandler(async (req, res) => {
  const version = await documentService.getVersion(
    normalizeCode(req.params.roomCode),
    req.params.versionId
  );
  if (!version) {
    throw new HttpError(404, 'Version not found');
  }
  res.json({ version });
}));

// Create a new version snapshot (requires auth; room must exist)
router.post('/:roomCode/versions', authenticate, asyncHandler(async (req, res) => {
  const { content, label } = req.body;
  if (!content) {
    throw new HttpError(400, 'Content is required');
  }

  const room = await getRoomByCode(req.params.roomCode);
  if (!room) {
    throw new HttpError(404, 'Room not found');
  }

  const version = await documentService.saveVersion(room.code, content, req.user!.id, label);
  res.status(201).json({ version });
}));

// Delete a version (requires auth; room must exist)
router.delete('/:roomCode/versions/:versionId', authenticate, asyncHandler(async (req, res) => {
  const room = await getRoomByCode(req.params.roomCode);
  if (!room) {
    throw new HttpError(404, 'Room not found');
  }

  const deleted = await documentService.deleteVersion(room.code, req.params.versionId);
  if (!deleted) {
    throw new HttpError(404, 'Version not found');
  }
  res.json({ message: 'Version deleted' });
}));

export default router;
