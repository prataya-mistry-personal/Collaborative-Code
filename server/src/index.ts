import './env.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import { setupRoomHandlers } from './websocket/room.handlers.js';
import { setupChatHandlers } from './websocket/chat.handlers.js';
import { setupSyncServer } from './websocket/sync.handler.js';
import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/room.routes.js';
import versionRoutes from './routes/version.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { pool } from './db/index.js';



const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rooms', versionRoutes); // version routes mounted under rooms

// Central error handler — must come after the routes. Maps thrown HttpErrors
// and known Postgres errors to clean JSON responses instead of Express's
// default HTML 500.
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Setup WebSocket handlers
setupRoomHandlers(io);
setupChatHandlers(io);

// Setup Yjs WebSocket sync server
setupSyncServer(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 API available at http://localhost:${PORT}/api`);
  console.log(`🔄 Yjs sync server on ws://localhost:${PORT}/sync`);
});


// Graceful shutdown: close Socket.IO (which closes the shared HTTP server),
// then the DB pool. Force-exit if connections don't drain in time.
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);
  io.close(async () => {
    await pool.end();
    console.log('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { io, app, server };
