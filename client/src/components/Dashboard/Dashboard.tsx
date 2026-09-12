import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

interface Room {
  id: string;
  name: string;
  code: string;
  language: string;
  is_public: boolean;
  created_at: string;
  owner_username?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomLanguage, setNewRoomLanguage] = useState('javascript');

  useEffect(() => {
    loadRooms();
    if (isAuthenticated) {
      loadMyRooms();
    }
  }, [isAuthenticated]);

  const loadRooms = async () => {
    try {
      const response = await roomApi.getRooms();
      setRooms(response.data.rooms);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyRooms = async () => {
    try {
      const response = await roomApi.getMyRooms();
      setMyRooms(response.data.rooms);
    } catch (error) {
      console.error('Failed to load my rooms:', error);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const response = await roomApi.createRoom(newRoomName, newRoomLanguage, true);
      navigate(`/editor/${response.data.room.code}`);
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const handleJoinRoom = async (code: string) => {
    try {
      await roomApi.joinRoom(code);
      navigate(`/editor/${code}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to join room');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Join or create a collaborative coding room</p>
        </div>
        {isAuthenticated && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-md text-white font-medium transition-colors"
          >
            + Create Room
          </button>
        )}
      </div>

      {/* Join Room */}
      <div className="bg-dark-100 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Join</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Enter room code (e.g., DEMO123)"
            className="flex-1 px-4 py-3 bg-dark-200 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value) {
                handleJoinRoom(e.currentTarget.value.toUpperCase());
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              if (input?.value) {
                handleJoinRoom(input.value.toUpperCase());
              }
            }}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-md text-white font-medium transition-colors"
          >
            Join
          </button>
        </div>
      </div>

      {/* My Rooms */}
      {isAuthenticated && myRooms.length > 0 && (
        <div className="bg-dark-100 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">My Rooms</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myRooms.map((room) => (
              <div
                key={room.id}
                className="bg-dark-200 rounded-lg p-4 border border-gray-700 hover:border-primary-500 transition-colors cursor-pointer"
                onClick={() => navigate(`/editor/${room.code}`)}
              >
                <h3 className="text-lg font-semibold text-white">{room.name}</h3>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-gray-400">Code: {room.code}</span>
                  <span className="text-xs px-2 py-1 bg-primary-600/20 text-primary-400 rounded">
                    {room.language}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Public Rooms */}
      <div className="bg-dark-100 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Public Rooms</h2>
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : rooms.length === 0 ? (
          <p className="text-gray-400">No public rooms available. Create one!</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-dark-200 rounded-lg p-4 border border-gray-700 hover:border-primary-500 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white">{room.name}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  by {room.owner_username || 'Anonymous'}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs px-2 py-1 bg-primary-600/20 text-primary-400 rounded">
                    {room.language}
                  </span>
                  <button
                    onClick={() => handleJoinRoom(room.code)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded text-sm text-white transition-colors"
                  >
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-100 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Room</h2>
            <form onSubmit={handleCreateRoom}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-200 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="My Awesome Room"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={newRoomLanguage}
                  onChange={(e) => setNewRoomLanguage(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-200 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 rounded-md text-white font-medium transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
