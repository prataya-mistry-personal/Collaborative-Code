import { useState } from 'react';
import { roomApi } from '../../services/api';

interface RoomSettingsProps {
  roomCode: string;
  roomId: string;
  currentLanguage: string;
  currentVisibility: 'public' | 'private';
  isOwner: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function RoomSettings({
  roomCode,
  roomId,
  currentLanguage,
  currentVisibility,
  isOwner,
  onClose,
  onUpdate,
}: RoomSettingsProps) {
  const [language, setLanguage] = useState(currentLanguage);
  const [visibility, setVisibility] = useState(currentVisibility);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await roomApi.updateRoom(roomId, { language, visibility });
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update room');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await roomApi.deleteRoom(roomId);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete room');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-100 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Room Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Room Code (read-only) */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Room Code</label>
            <div className="bg-dark-200 border border-gray-600 text-white px-4 py-2 rounded-md font-mono">
              {roomCode}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Default Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={!isOwner}
              className="w-full bg-dark-200 border border-gray-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
              disabled={!isOwner}
              className="w-full bg-dark-200 border border-gray-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <option value="public">Public (visible in room list)</option>
              <option value="private">Private (join by code only)</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            {isOwner && (
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>

          {/* Delete room (owner only) */}
          {isOwner && (
            <div className="pt-4 border-t border-gray-700">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Delete Room
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-red-400 text-sm">
                    Are you sure? This action cannot be undone.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-1.5 text-gray-400 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
                    >
                      {loading ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isOwner && (
            <p className="text-gray-500 text-xs text-center pt-2">
              Only the room owner can change settings
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
