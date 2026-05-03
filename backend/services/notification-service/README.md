# Notification Service

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


> **Real-time Notification & Broadcast microservice for Project Nexus**

## Overview

The Notification Service provides real-time event delivery via WebSockets with MongoDB persistence. It uses Redis Pub/Sub as the messaging backbone to synchronize messages across multiple service instances.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework (REST + WebSocket) |
| **MongoDB** | Notification and Announcement persistence |
| **Redis** | Pub/Sub messaging for real-time delivery |
| **Motor** | Async MongoDB driver |
| **Python 3.11** | Runtime |

## Architecture

1.  **Ingestion**: Services send notifications via the REST API (External or Internal).
2.  **Persistence**: Notifications are stored in MongoDB.
3.  **Real-time Delivery**:
    *   The service publishes a message to a Redis channel (`notify:{user_id}`).
    *   A background `redis_subscriber_loop` listens for messages on all `notify:*` channels.
    *   When a message is received, the `ConnectionManager` sends it to all active WebSocket connections for that user.
    *   `notify:broadcast` messages are sent to all connected users.

## API Endpoints

All REST endpoints are prefixed with `/api/v1/notify`.

### REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/notifications` | Admin/Faculty | Create a notification for a user |
| `POST` | `/internal/notifications` | Internal API Key | Create a notification (used by other services) |
| `GET` | `/notifications/me` | Yes | Get current user's notification history |
| `PUT` | `/notifications/{id}/read` | Yes | Mark a notification as read |
| `PUT` | `/notifications/read-all` | Yes | Mark all notifications as read |
| `POST` | `/announcements/global` | Admin | Create a global broadcast announcement |
| `GET` | `/health` | No | Health check |

### WebSocket API

| Protocol | Path | Auth | Description |
|----------|------|------|-------------|
| `WS` | `/api/v1/notify/ws?token=...` | JWT as query param | Real-time notification stream |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URL` | `mongodb://mongodb:27017/nexus_notify` | MongoDB connection string |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string |
| `JWT_SECRET` | *required* | Secret key for JWT signing |
| `INTERNAL_API_KEY` | *required* | Key for service-to-service auth |

## MongoDB Collections (Database: `nexus_notify`)

| Collection | Description |
|------------|-------------|
| `notifications` | User-specific notifications |
| `content_announcements` | Global announcements |

## Redis Pub/Sub Channels

| Channel | Purpose |
|---------|---------|
| `notify:{user_id}` | Direct notifications for a specific user |
| `notify:broadcast` | Global broadcast messages for all connected users |
