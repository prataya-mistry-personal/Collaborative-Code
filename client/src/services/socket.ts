import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Generic emit method
  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  // Generic on method
  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }


  // Room events
  joinRoom(roomCode: string, userId?: string) {
    this.socket?.emit('join-room', { roomCode, userId });
  }

  leaveRoom(roomCode: string) {
    this.socket?.emit('leave-room', { roomCode });
  }

  // Cursor events
  sendCursorUpdate(roomCode: string, position: any) {
    this.socket?.emit('cursor-update', { roomCode, position });
  }

  // Selection events
  sendSelectionUpdate(roomCode: string, selection: any) {
    this.socket?.emit('selection-update', { roomCode, selection });
  }

  // Language change
  sendLanguageChange(roomCode: string, language: string) {
    this.socket?.emit('language-change', { roomCode, language });
  }

  // Chat events
  sendChatMessage(roomCode: string, content: string, userId?: string, username?: string) {
    this.socket?.emit('chat-message', { roomCode, content, userId, username });
  }

  getChatHistory(roomCode: string, limit?: number) {
    this.socket?.emit('get-chat-history', { roomCode, limit });
  }

  // Event listeners
  onRoomJoined(callback: (data: any) => void) {
    this.socket?.on('room-joined', callback);
  }

  onUserJoined(callback: (data: any) => void) {
    this.socket?.on('user-joined', callback);
  }

  onUserLeft(callback: (data: any) => void) {
    this.socket?.on('user-left', callback);
  }

  onCursorUpdate(callback: (data: any) => void) {
    this.socket?.on('cursor-update', callback);
  }

  onSelectionUpdate(callback: (data: any) => void) {
    this.socket?.on('selection-update', callback);
  }

  onLanguageChange(callback: (data: any) => void) {
    this.socket?.on('language-change', callback);
  }

  onChatMessage(callback: (data: any) => void) {
    this.socket?.on('chat-message', callback);
  }

  onChatHistory(callback: (data: any) => void) {
    this.socket?.on('chat-history', callback);
  }

  onError(callback: (data: any) => void) {
    this.socket?.on('error', callback);
  }

  // Remove listeners
  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();
