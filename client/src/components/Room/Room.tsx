import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socketService } from '../../services/socket';
import { useAuthStore } from '../../stores/authStore';
import { roomApi } from '../../services/api';
import RoomSettings from './RoomSettings';

interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  username: string;
  createdAt: string;
  isSystem?: boolean;
}

interface RoomUser {
  id: string;
  userId?: string | null;
  username: string;
  color: string;
}

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [roomName, setRoomName] = useState('');
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    if (!code) return;

    socketService.connect();
    socketService.joinRoom(code, user?.id);

    socketService.onRoomJoined((data: any) => {
      setUsers(data.users || []);
      // Add system message
      setMessages((prev) => [...prev, {
        id: `sys-joined-${Date.now()}`,
        content: `You joined the room`,
        userId: 'system',
        username: 'System',
        createdAt: new Date().toISOString(),
        isSystem: true,
      }]);
    });

    socketService.onUserJoined((data: any) => {
      setUsers((prev) => [...prev, {
        id: data.id,
        userId: data.userId,
        username: data.username,
        color: data.color,
      }]);
      // System message for user joining
      setMessages((prev) => [...prev, {
        id: `sys-${data.id}-${Date.now()}`,
        content: `${data.username} joined the room`,
        userId: 'system',
        username: 'System',
        createdAt: new Date().toISOString(),
        isSystem: true,
      }]);
    });

    socketService.onUserLeft((data: any) => {
      setUsers((prev) => {
        const leftUser = prev.find((u) => u.id === data.id);
        if (leftUser) {
          // System message for user leaving
          setMessages((prevMsgs) => [...prevMsgs, {
            id: `sys-left-${data.id}-${Date.now()}`,
            content: `${leftUser.username} left the room`,
            userId: 'system',
            username: 'System',
            createdAt: new Date().toISOString(),
            isSystem: true,
          }]);
        }
        return prev.filter((u) => u.id !== data.id);
      });
    });

    socketService.onChatMessage((data: any) => {
      setMessages((prev) => [...prev, data]);
      setTimeout(scrollToBottom, 100);
      // Remove from typing users
      setTypingUsers((prev) => prev.filter((u) => u !== data.username));
    });

    socketService.onChatHistory((data: any) => {
      setMessages(data.messages || []);
      setTimeout(scrollToBottom, 100);
    });

    // Typing indicators
    socketService.on('user-typing', (data: any) => {
      if (data.userId !== user?.id) {
        setTypingUsers((prev) => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      }
    });

    socketService.on('user-stop-typing', (data: any) => {
      setTypingUsers((prev) => prev.filter((u) => u !== data.username));
    });

    // Load room info and chat history
    loadRoomInfo();
    socketService.getChatHistory(code);

    return () => {
      socketService.leaveRoom(code);
      socketService.off('room-joined');
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('chat-message');
      socketService.off('chat-history');
      socketService.off('user-typing');
      socketService.off('user-stop-typing');
    };
  }, [code, user?.id]);

  const loadRoomInfo = async () => {
    if (!code) return;
    try {
      const response = await roomApi.getRoomByCode(code);
      setRoomName(response.data.room.name);
      setRoomInfo(response.data.room);
    } catch (error) {
      console.error('Failed to load room:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !code) return;

    socketService.sendChatMessage(code, newMessage, user?.id, user?.username);
    setNewMessage('');

    // Stop typing indicator
    if (code) {
      socketService.emit('stop-typing', { roomCode: code, userId: user?.id, username: user?.username });
    }
    setTypingUsers((prev) => prev.filter((u) => u !== user?.username));
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Emit typing indicator
    if (code && user) {
      socketService.emit('typing', { roomCode: code, userId: user.id, username: user.username });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socketService.emit('stop-typing', { roomCode: code, userId: user.id, username: user.username });
      }, 2000);
    }
  };

  const handleEnterEditor = () => {
    if (code) {
      navigate(`/editor/${code}`);
    }
  };

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
    }
  };

  const isOwner = roomInfo?.owner_id === user?.id;

  return (
    <div className="h-[calc(100vh-140px)] flex gap-4">
      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Room info */}
        <div className="bg-dark-100 rounded-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-white">{roomName || 'Room'}</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-dark-200 hover:bg-dark-300 text-gray-300 rounded-md text-sm transition-colors border border-gray-700"
              >
                Copy Code
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-3 py-1.5 bg-dark-200 hover:bg-dark-300 text-gray-300 rounded-md text-sm transition-colors border border-gray-700"
              >
                ⚙ Settings
              </button>
            </div>
          </div>
          <p className="text-gray-400 mb-4">
            Room Code: <span className="font-mono text-primary-400">{code}</span>
            {roomInfo?.language && (
              <span className="ml-3 text-gray-500">Language: {roomInfo.language}</span>
            )}
          </p>

          <button
            onClick={handleEnterEditor}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-md text-white font-medium transition-colors"
          >
            Enter Editor →
          </button>
        </div>

        {/* Chat */}
        <div className="flex-1 bg-dark-100 rounded-lg flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Room Chat</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start space-x-3">
                {msg.isSystem ? (
                  <div className="flex-1 text-center py-1">
                    <span className="text-gray-500 text-xs italic">{msg.content}</span>
                  </div>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {msg.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-white font-medium">{msg.username}</span>
                        <span className="text-gray-500 text-xs">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-300">{msg.content}</p>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Typing indicators */}
            {typingUsers.length > 0 && (
              <div className="flex items-center space-x-2 text-gray-500 text-sm italic">
                <div className="flex space-x-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.join(', ')} are typing...`}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleMessageChange}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-dark-200 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-md text-white font-medium transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sidebar - Users */}
      <div className="w-64 bg-dark-100 rounded-lg p-4 flex flex-col">
        <h2 className="text-lg font-semibold text-white mb-4">
          Online Users ({users.length})
        </h2>
        <div className="space-y-2 flex-1">
          {users.map((u) => (
            <div key={u.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-dark-200 transition-colors">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: u.color }}
              />
              <span className="text-gray-300">{u.username}</span>
              {u.userId === user?.id && (
                <span className="text-gray-600 text-xs">(You)</span>
              )}
            </div>
          ))}
        </div>

        {/* Room info footer */}
        {roomInfo && (
          <div className="pt-4 border-t border-gray-700 space-y-1">
            <div className="text-gray-500 text-xs">
              Created: {new Date(roomInfo.created_at).toLocaleDateString()}
            </div>
            <div className="text-gray-500 text-xs">
              Visibility: {roomInfo.is_public ? 'Public' : 'Private'}
            </div>
            {isOwner && (
              <div className="text-primary-400 text-xs font-medium">You are the owner</div>
            )}
          </div>
        )}
      </div>

      {/* Settings modal */}
      {showSettings && roomInfo && (
        <RoomSettings
          roomCode={code || ''}
          roomId={roomInfo.id}
          currentLanguage={roomInfo.language || 'javascript'}
          currentVisibility={roomInfo.is_public ? 'public' : 'private'}
          isOwner={isOwner}
          onClose={() => setShowSettings(false)}
          onUpdate={loadRoomInfo}
        />
      )}
    </div>
  );
}
