# CollabCode - Real-time Collaborative Code Editor

A modern, feature-rich collaborative code editor that allows multiple developers to code together in real-time, similar to Google Docs for code.

## 🚀 Features

### Core Features
- **Real-time Collaboration** - Multiple users can edit code simultaneously
- **Live Cursors** - See where other users are typing with color-coded cursors
- **Room-based System** - Create or join rooms with unique 6-character codes
- **Syntax Highlighting** - Support for 15+ programming languages
- **In-room Chat** - Communicate with collaborators via built-in chat
- **User Authentication** - Secure JWT-based authentication
- **User Presence** - See who's online and actively collaborating

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Monaco Editor, Zustand, Socket.io-client
- **Backend**: Node.js, Express, TypeScript, Socket.io, JWT
- **Database**: PostgreSQL (user data, rooms, messages)
- **Containerization**: Docker, Docker Compose

## 📋 Prerequisites

- Node.js 20+
- npm

Docker is optional — only needed if you prefer running PostgreSQL in containers.

## 🛠️ Getting Started

### 1. Clone the Repository

```bash
cd collab-code-editor
```

### 2. Set Up Environment Variables (Optional)

Copy the example environment file:

```bash
cp .env.example .env
```

This is optional — the defaults work out of the box.

### 3. Start the App (No Docker Needed)

```bash
npm install
npm run dev
```

On the first run this automatically:

- Initialises an embedded PostgreSQL 16 cluster in `.pgdata/` (gitignored)
- Creates the `collab_code` database, runs migrations and seeds demo data
- Starts the API/WebSocket server and the client

Press **Ctrl+C once** to stop everything (database included) — your data stays in `.pgdata/` and is reused on the next run.

The application will be available at:
- **Client**: http://localhost:3000
- **Server**: http://localhost:4000
- **PostgreSQL**: localhost:5432

### Useful Database Commands

| Command | Description |
|--------|-------------|
| `npm run db:stop` | Stop the embedded PostgreSQL (data is preserved) |
| `npm run db:start` | Start the embedded PostgreSQL standalone |
| `npm run migrate --workspace=server` | Re-run migrations (idempotent, also runs on every start) |
| `npm run seed --workspace=server` | Re-seed demo data (also runs once on a fresh database) |

To reset the database from scratch: stop the app, delete the `.pgdata/` folder, run `npm run dev` again.

### 4. Alternative: Start with Docker

```bash
# Start all services (PostgreSQL, Server, Client)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Note: stop the native PostgreSQL first (`npm run db:stop`) — both use port 5432.

## 📁 Project Structure

```
collab-code-editor/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── stores/        # Zustand state management
│   │   ├── services/      # API & Socket services
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── server/                # Node.js Backend
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth middleware
│   │   ├── services/     # Business logic
│   │   ├── websocket/    # Socket.io handlers
│   │   ├── db/           # Database & migrations
│   │   ├── scripts/      # Embedded PostgreSQL start/stop
│   │   └── index.ts
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

## 🔑 Default Test Credentials

After running the seed script:
- **Email**: test@example.com
- **Password**: password123

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | Get public rooms |
| GET | `/api/rooms/:code` | Get room by code |
| POST | `/api/rooms` | Create room |
| POST | `/api/rooms/:code/join` | Join room |
| POST | `/api/rooms/:code/leave` | Leave room |
| DELETE | `/api/rooms/:id` | Delete room |

## 🔌 WebSocket Events

### Client → Server
- `join-room` - Join a collaboration room
- `leave-room` - Leave a room
- `cursor-update` - Update cursor position
- `selection-update` - Update text selection
- `language-change` - Change editor language
- `chat-message` - Send chat message
- `get-chat-history` - Request chat history

### Server → Client
- `room-joined` - Successfully joined room
- `user-joined` - New user joined
- `user-left` - User left the room
- `cursor-update` - Remote cursor update
- `selection-update` - Remote selection update
- `language-change` - Language changed
- `chat-message` - New chat message
- `chat-history` - Chat history response

## 🧪 Development Commands

```bash
# Root commands
npm run dev          # Start embedded PostgreSQL + server + client
npm run db:stop      # Stop the embedded PostgreSQL (data preserved)
npm run db:start     # Start the embedded PostgreSQL standalone
npm run build        # Build both projects
npm run lint         # Lint all code
npm run format       # Format with Prettier

# Docker commands
npm run docker:up    # Start Docker services
npm run docker:down  # Stop Docker services
npm run docker:logs  # View Docker logs

# Workspace commands
npm run dev --workspace=client   # Start client only
npm run dev --workspace=server   # Start server only
```

## 🚀 Roadmap

### Phase 1 (Current)
- [x] Project setup & architecture
- [x] Authentication system
- [x] Room management
- [x] Basic WebSocket handlers
- [ ] Monaco Editor integration
- [ ] Real-time sync with Yjs/CRDT

### Phase 2 (Upcoming)
- [ ] Real-time cursor tracking
- [ ] Selection sync
- [ ] Chat system
- [ ] Code execution sandbox

### Phase 3 (Future)
- [ ] Version history
- [ ] GitHub integration
- [ ] Video/audio calls (WebRTC)
- [ ] AI pair programmer

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Yjs](https://yjs.dev/) - CRDT for real-time sync
- [Socket.io](https://socket.io/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
---

Built with ❤️ for collaborative coding
