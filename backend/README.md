# CodeOrbit Backend

Real-time collaborative coding backend server.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Option 1: Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend npx prisma db push

# Seed database
docker-compose exec backend npm run db:seed
```

### Option 2: Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup database:**
   ```bash
   # Create PostgreSQL database named 'codeorbit'
   npx prisma db push
   npm run db:seed
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:3000`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/signup | Create new account |
| POST | /auth/login | Login |
| POST | /auth/logout | Logout |
| GET | /auth/me | Get current user |

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /sessions | Create new session |
| GET | /sessions/history | Get session history |
| GET | /sessions/:code | Get session by code |
| POST | /sessions/:code/join | Join session |
| POST | /sessions/:code/approve/:id | Approve participant |
| POST | /sessions/:code/decline/:id | Decline participant |
| POST | /sessions/:code/end | End session |

### Code Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /execution/run | Execute code |
| POST | /execution/run-web | Execute web code |
| GET | /execution/languages | List languages |

## WebSocket Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| join_session | { sessionCode } | Join a session |
| create_session | { languagePreset, approvalMode, maxParticipants } | Create session |
| code_change | { sessionCode, tabId, content } | Update code |
| cursor_position | { sessionCode, position } | Send cursor position |
| annotation_stroke | { sessionCode, stroke } | Send annotation |
| chat_message | { sessionCode, text } | Send chat message |
| run_code | { sessionCode, language, code, stdin } | Run code |
| leave_session | { sessionCode } | Leave session |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| session_created | session | Session created |
| session_joined | session | Joined session |
| participant_joined | participant | Someone joined |
| participant_left | { participantId } | Someone left |
| code_update | { tabId, content, participantId } | Code changed |
| cursor_update | position | Cursor moved |
| annotation_received | stroke | Annotation received |
| chat_message | message | Chat message |
| run_result | result | Code execution result |
| session_ended | - | Session ended |

## Environment Variables

See `.env.example` for all required variables.

## Tech Stack

- Express.js
- Socket.IO
- Prisma ORM
- PostgreSQL
- Redis
- JWT Authentication
