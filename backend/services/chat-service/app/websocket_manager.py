from fastapi import WebSocket
from typing import Dict, List


class ConnectionManager:
    """Manages active WebSocket connections grouped by chat session."""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept a WebSocket connection and register it under a session."""
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        """Remove a WebSocket connection from a session."""
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast(self, message: dict, session_id: str):
        """Send a JSON message to every connection in a session."""
        if session_id in self.active_connections:
            dead: List[WebSocket] = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead.append(connection)
            for ws in dead:
                self.active_connections[session_id].remove(ws)

    async def send_personal(self, message: dict, websocket: WebSocket):
        """Send a JSON message to a single connection."""
        await websocket.send_json(message)

    def get_session_connections(self, session_id: str) -> List[WebSocket]:
        """Return all active connections for a session."""
        return self.active_connections.get(session_id, [])


manager = ConnectionManager()
