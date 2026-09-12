import { pool } from '../db/index.js';

export interface DocumentVersion {
  id: string;
  room_code: string;
  content: string;
  label: string | null;
  created_by: string;
  created_at: Date;
  created_by_username?: string;
}

export class DocumentService {
  /**
   * Save a document snapshot/version
   */
  async saveVersion(
    roomCode: string,
    content: string,
    userId: string,
    label?: string
  ): Promise<DocumentVersion> {
    const result = await pool.query(
      `INSERT INTO document_versions (room_code, content, label, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, room_code, content, label, created_by, created_at`,
      [roomCode, content, label || null, userId]
    );
    return result.rows[0];
  }

  /**
   * Get all versions for a room
   */
  async getVersions(roomCode: string, limit: number = 50): Promise<DocumentVersion[]> {
    const result = await pool.query(
      `SELECT dv.*, u.username as created_by_username
       FROM document_versions dv
       LEFT JOIN users u ON dv.created_by = u.id
       WHERE dv.room_code = $1
       ORDER BY dv.created_at DESC
       LIMIT $2`,
      [roomCode, limit]
    );
    return result.rows;
  }

  /**
   * Get a specific version by ID
   */
  async getVersion(roomCode: string, versionId: string): Promise<DocumentVersion | null> {
    const result = await pool.query(
      `SELECT dv.*, u.username as created_by_username
       FROM document_versions dv
       LEFT JOIN users u ON dv.created_by = u.id
       WHERE dv.room_code = $1 AND dv.id = $2`,
      [roomCode, versionId]
    );
    return result.rows[0] || null;
  }

  /**
   * Delete a version
   */
  async deleteVersion(roomCode: string, versionId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM document_versions WHERE room_code = $1 AND id = $2',
      [roomCode, versionId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const documentService = new DocumentService();
