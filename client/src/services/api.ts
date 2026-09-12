import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: on an unexpected 401 (e.g. an expired token on a
// protected request) log out and send the user to login. Skip auth endpoints
// and the login page itself so a failed login keeps its inline error instead
// of triggering a full page reload.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url || '';
    const isAuthEndpoint = url.includes('/api/auth/');
    if (status === 401 && !isAuthEndpoint && window.location.pathname !== '/login') {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  register: (username: string, email: string, password: string) =>
    api.post('/api/auth/register', { username, email, password }),

  me: () => api.get('/api/auth/me'),
};

// Room API
export const roomApi = {
  getRooms: (limit?: number, offset?: number) =>
    api.get('/api/rooms', { params: { limit, offset } }),

  getRoomByCode: (code: string) =>
    api.get(`/api/rooms/${code}`),

  createRoom: (name: string, language?: string, isPublic?: boolean) =>
    api.post('/api/rooms', { name, language, isPublic }),

  joinRoom: (code: string) =>
    api.post(`/api/rooms/${code}/join`),

  getMyRooms: () =>
    api.get('/api/rooms/user/my-rooms'),

  deleteRoom: (id: string) =>
    api.delete(`/api/rooms/${id}`),

  updateRoom: (id: string, data: { language?: string; visibility?: string }) =>
    api.put(`/api/rooms/${id}`, data),

  // Version history
  getVersions: (roomCode: string) =>
    api.get(`/api/rooms/${roomCode}/versions`),

  createVersion: (roomCode: string, content: string, label?: string) =>
    api.post(`/api/rooms/${roomCode}/versions`, { content, label }),

  deleteVersion: (roomCode: string, versionId: string) =>
    api.delete(`/api/rooms/${roomCode}/versions/${versionId}`),
};
