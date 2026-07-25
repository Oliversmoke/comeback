# RickChat Architecture

## Overview

RickChat is a multi-service backend platform powering an AI Operating System with 18 microservices, each handling a specific domain. The architecture follows a distributed monolith pattern with an API Gateway providing unified access.

## Architecture Diagram

```
                                    ┌──────────────┐
                                    │   Firebase    │
                                    │  Auth / FCM   │
                                    └──────┬───────┘
                                           │
┌──────────┐    ┌──────────────────────────────────────────────┐
│  Client   │────▶          API Gateway (8080)                  │
│  (App/    │    │   Rate Limit │ JWT Auth │ CORS │ Routing    │
│   Web)    │    └──────┬──────┬──────┬──────┬──────┬────────┘
└──────────┘           │      │      │      │      │
                       │      │      │      │      │
         ┌─────────────┘ ┌────┘ ┌────┘ ┌────┘ ┌────┘
         ▼               ▼      ▼      ▼      ▼
    ┌─────────┐   ┌─────────┐ ┌────┐ ┌────┐ ┌────┐
    │ Auth    │   │ Chat    │ │ AI │ │Mem │ │... │
    │ 8081    │   │ 8083    │ │8084│ │8085│ │    │
    └────┬────┘   └────┬────┘ └──┬─┘ └──┬─┘ └────┘
         │             │         │      │
         ▼             ▼         ▼      ▼
    ┌──────────────────────────────────────────┐
    │         PostgreSQL (pgvector)             │
    │   users │ chats │ memory │ marketplace    │
    │   courses │ payments │ analytics...       │
    └──────────────────────────────────────────┘
         │             │         │      │
         ▼             ▼         ▼      ▼
    ┌──────────────────────────────────────────┐
    │              Redis                        │
    │   Cache │ Sessions │ Rate Limits │ Queue  │
    └──────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────────┐
    │            Qdrant                         │
    │   Vector Index │ Semantic Search          │
    └──────────────────────────────────────────┘
```

## Data Flow

1. **Client Request** → API Gateway authenticates JWT, applies rate limits, proxies to service
2. **Service** → Processes request, reads/writes PostgreSQL via Exposed ORM + raw SQL
3. **Memory Operations** → Embedding generated via AI Gateway → Stored in Qdrant + PostgreSQL
4. **Chat Messages** → Sent via WebSocket → Redis pub/sub → Broadcast to room participants
5. **Background Jobs** → Published to PubSub → Consumed by worker services
6. **Analytics** → Events tracked asynchronously → Aggregated for dashboards

## Key Design Decisions

- **Synchronous API** for CRUD operations (REST/JSON)
- **WebSockets** for real-time chat and collaboration
- **Server-Sent Events** for AI streaming responses
- **CQRS** pattern for analytics (separate write/read paths)
- **Event Sourcing** via PubSub for cross-service communication
- **Polyglot Persistence**: PostgreSQL (relational), Qdrant (vectors), Redis (cache), Firestore (real-time sync)
- **Circuit Breaker** pattern for AI provider calls (failover between OpenAI/Gemini/Anthropic)

## Service Communication

- **Synchronous**: HTTP REST between API Gateway and services
- **Asynchronous**: PubSub messages for background tasks
- **Real-time**: WebSocket connections managed by Chat Service
