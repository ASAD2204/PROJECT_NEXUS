import json
import asyncio
import logging
from fastapi import WebSocket
from typing import Dict, List, Set
from app.database import redis_client

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Enhanced ConnectionManager supporting:
    1. Distributed messaging via Redis Pub/Sub.
    2. Session-based grouping of WebSockets.
    3. Cross-instance synchronization for Docker Swarm/Kubernetes.
    """

    def __init__(self):
        # session_id -> list of local websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # user_id -> set of session_ids they are active in (locally)
        self.user_sessions: Dict[str, Set[str]] = {}
        self.pubsub_task = None

    async def connect(self, websocket: WebSocket, session_id: str, user_id: str):
        """Accept connection and start Redis subscription if first time."""
        await websocket.accept()
        
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = set()
        self.user_sessions[user_id].add(session_id)

        # Ensure Redis Pub/Sub listener is running
        if self.pubsub_task is None:
            self.pubsub_task = asyncio.create_task(self._redis_listener())

    def disconnect(self, websocket: WebSocket, session_id: str, user_id: str):
        """Remove connection and cleanup maps."""
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

        if user_id in self.user_sessions:
            if session_id in self.user_sessions[user_id]:
                self.user_sessions[user_id].remove(session_id)
            if not self.user_sessions[user_id]:
                del self.user_sessions[user_id]

    async def broadcast_local(self, message: dict, session_id: str):
        """Send message to connections on THIS instance."""
        if session_id in self.active_connections:
            dead: List[WebSocket] = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead.append(connection)
            for ws in dead:
                self.active_connections[session_id].remove(ws)

    async def broadcast_global(self, message: dict, session_id: str):
        """Publish message to Redis for ALL instances to pick up."""
        payload = {
            "session_id": session_id,
            "data": message
        }
        await redis_client.publish("chat_messages", json.dumps(payload))

    async def _redis_listener(self):
        """Listen for messages from other instances via Redis Pub/Sub."""
        pubsub = redis_client.pubsub()
        await pubsub.subscribe("chat_messages")
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    payload = json.loads(message["data"])
                    target_session = payload.get("session_id")
                    data = payload.get("data")
                    if target_session and data:
                        await self.broadcast_local(data, target_session)
        except Exception as e:
            logger.error(f"Redis Pub/Sub listener error: {e}")
            self.pubsub_task = None

manager = ConnectionManager()
