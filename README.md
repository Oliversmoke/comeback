# RickChat — AI Operating System

AI-powered social productivity platform combining chat, goals, tasks, AI coaching, and real-time collaboration.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Client (Next.js 15)                     │
│          Server Components + Client Components            │
│         Tailwind CSS · Framer Motion · Zustand           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/WS
┌──────────────────────▼──────────────────────────────────┐
│         API Gateway (Express.js · port 5000)              │
│        Helmet · CORS · Rate Limit · Passport · JWT       │
├──────────────────────────────────────────────────────────┤
│  Auth  │ Goals  │ Tasks  │ Groups  │ Chat  │ AI  │ Leader │
├──────────────────────────────────────────────────────────┤
│              Socket.io (Real-time Messaging)              │
├──────────────────────────────────────────────────────────┤
│              MongoDB · Redis · OpenAI/Gemini              │
└──────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| **State** | Zustand with persist middleware |
| **Animations** | Framer Motion |
| **Backend** | Node.js, Express.js, ES Modules |
| **Database** | MongoDB via Mongoose |
| **Auth** | JWT (access + refresh), Passport (local, JWT, Google OAuth) |
| **Real-time** | Socket.io (messaging, typing, presence) |
| **AI** | Provider-agnostic (OpenAI, Anthropic, Gemini, fallback) |
| **Validation** | Zod |

## Quick Start

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Configure environment
cp server/.env.example server/.env
cp client/.env.local.example client/.env.local

# Start backend (terminal 1)
cd server && npm run dev

# Start frontend (terminal 2)
cd client && npm run dev
```

## Project Structure

```
├── client/                     # Next.js 15 frontend
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── ai-coach/       # AI Coach chat interface
│   │   │   ├── auth/           # Login & Register
│   │   │   ├── chat/           # Group chat
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── goals/          # Goals (list, detail, create)
│   │   │   ├── groups/         # Groups (list, create, join)
│   │   │   ├── leaderboard/    # User & group rankings
│   │   │   ├── settings/       # User settings
│   │   │   └── tasks/          # Task management
│   │   ├── components/
│   │   │   ├── animations/     # Framer Motion wrappers
│   │   │   ├── error/          # Error boundary
│   │   │   └── layout/         # Navbar, Sidebar
│   │   ├── lib/                # API client, socket, utils
│   │   ├── store/              # Zustand stores
│   │   └── types/              # TypeScript interfaces
│   └── tailwind.config.ts
│
├── server/                     # Express.js backend
│   ├── src/
│   │   ├── config/             # Database, Passport
│   │   ├── middleware/         # Auth, error handling
│   │   ├── models/             # Mongoose schemas
│   │   ├── routes/             # API route handlers
│   │   ├── services/           # Business logic
│   │   │   └── ai/             # Multi-provider AI adapter
│   │   ├── socket/             # WebSocket handlers
│   │   └── validators/         # Zod schemas
│   └── package.json
│
├── core/                       # Kotlin shared library
├── *-service/                  # Kotlin microservices (18 total)
├── k8s/                        # Kubernetes manifests
├── load-testing/               # k6 test scripts
├── docs/                       # Documentation
└── docker-compose.yml          # Infrastructure stack
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/google` | Google OAuth |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get profile |
| PUT | `/api/auth/profile` | Update profile |

### Goals
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/goals` | List goals |
| POST | `/api/goals` | Create goal |
| GET | `/api/goals/:id` | Get goal |
| PUT | `/api/goals/:id` | Update goal |
| DELETE | `/api/goals/:id` | Delete goal |
| POST | `/api/goals/:id/milestones` | Add milestone |
| PUT | `/api/goals/:id/milestones/:mid` | Toggle milestone |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List tasks |
| GET | `/api/tasks/today` | Today's tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| POST | `/api/tasks/:id/complete` | Complete task |
| DELETE | `/api/tasks/:id` | Delete task |

### Groups
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/groups` | List groups |
| GET | `/api/groups/my` | My groups |
| POST | `/api/groups` | Create group |
| GET | `/api/groups/:id` | Get group |
| POST | `/api/groups/join/:code` | Join by invite code |
| POST | `/api/groups/:id/leave` | Leave group |

### AI
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/generate-tasks` | AI task generation |
| POST | `/api/ai/insights` | Productivity insights |
| POST | `/api/ai/chat` | AI coach chat |
| POST | `/api/ai/group-adapt` | Group task adaptation |

### Leaderboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leaderboard/users` | User rankings |
| GET | `/api/leaderboard/groups` | Group rankings |
| GET | `/api/leaderboard/user-rank` | Current user rank |

## Environment Variables

### Server (`server/.env`)
| Variable | Required | Default |
|----------|----------|---------|
| `PORT` | No | `5000` |
| `MONGODB_URI` | **Yes** | — |
| `JWT_SECRET` | **Yes** | — |
| `JWT_EXPIRES_IN` | No | `7d` |
| `FRONTEND_URL` | No | `http://localhost:3000` |
| `AI_PROVIDER` | No | `openai` |
| `OPENAI_API_KEY` | No | — |
| `ANTHROPIC_API_KEY` | No | — |
| `GEMINI_API_KEY` | No | — |

### Client (`client/.env.local`)
| Variable | Required | Default |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:5000` |
| `NEXT_PUBLIC_SOCKET_URL` | No | `http://localhost:5000` |

## AI Provider Support

The AI service supports multiple providers through a common adapter interface:

```env
AI_PROVIDER=openai       # OpenAI (default)
AI_PROVIDER=anthropic    # Anthropic Claude
AI_PROVIDER=gemini       # Google Gemini
# If no API key is configured, falls back to mock responses
```

## Deployment

### Docker
```bash
docker compose up -d
```

### Kubernetes
```bash
kubectl apply -k k8s/overlays/production
```

### Render (Node.js backend)
The `render.yaml` configuration deploys the Node.js server. Set environment variables via the Render dashboard.
