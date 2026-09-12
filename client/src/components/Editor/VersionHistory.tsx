import { useState, useEffect } from 'react';
import { roomApi } from '../../services/api';

interface VersionHistoryProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (content: string) => void;
}

interface Version {
  id: string;
  room_code: string;
  content: string;
  label: string | null;
  created_by: string;
  created_at: string;
  created_by_username?: string;
}

export default function VersionHistory({ roomCode, isOpen, onClose, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, roomCode]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const response = await roomApi.getVersions(roomCode);
      setVersions(response.data.versions || []);
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (version: Version) => {
    if (window.confirm(`Restore to version from ${new Date(version.created_at).toLocaleString()}?`)) {
      onRestore(version.content);
      onClose();
    }
  };

  const handleDelete = async (versionId: string) => {
    if (window.confirm('Delete this version?')) {
      try {
        await roomApi.deleteVersion(roomCode, versionId);
        fetchVersions();
      } catch (err) {
        console.error('Failed to delete version:', err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-100 rounded-lg p-6 w-full max-w-2xl border border-gray-700 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Version History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Versions list */}
        <div className="flex-1 overflow-auto space-y-2">
          {loading ? (
            <div className="text-gray-400 text-center py-8">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No saved versions yet. Use the "💾 Save" button in the editor toolbar to create one.
            </div>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className="bg-dark-200 border border-gray-700 rounded-md p-3 hover:border-gray-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {version.label && (
                        <span className="text-white font-medium text-sm">{version.label}</span>
                      )}
                      <span className="text-gray-500 text-xs">
                        {new Date(version.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      by {version.created_by_username || 'Unknown'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedVersion(version)}
                      className="text-primary-400 hover:text-primary-300 text-xs"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleRestore(version)}
                      className="text-green-400 hover:text-green-300 text-xs"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDelete(version.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Preview */}
        {selectedVersion && (
          <div className="mt-4 p-3 bg-dark-200 rounded-md border border-gray-700 max-h-40 overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Preview</span>
              <button
                onClick={() => setSelectedVersion(null)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <pre className="text-gray-300 text-xs whitespace-pre-wrap font-mono">
              {selectedVersion.content.slice(0, 500)}
              {selectedVersion.content.length > 500 && '...'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
