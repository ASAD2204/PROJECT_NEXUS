import asyncio
import contextlib
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import redis_client
from app.dependencies import decode_token
from app.routes import router


class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.connections:
            self.connections[user_id].discard(websocket)
            if not self.connections[user_id]:
                self.connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, payload: dict):
        sockets = list(self.connections.get(user_id, set()))
        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(user_id, ws)

    async def broadcast(self, payload: dict):
        for user_id in list(self.connections.keys()):
            await self.send_to_user(user_id, payload)


manager = ConnectionManager()


async def redis_subscriber_loop():
    pubsub = redis_client.pubsub()
    await pubsub.psubscribe("notify:*")
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if not message:
                await asyncio.sleep(0.05)
                continue
            channel = message.get("channel")
            data = message.get("data")
            if not isinstance(data, str):
                continue
            payload = json.loads(data)
            if channel == "notify:broadcast":
                await manager.broadcast(payload)
            elif isinstance(channel, str) and channel.startswith("notify:"):
                user_id = channel.split(":", 1)[1]
                await manager.send_to_user(user_id, payload)
    finally:
        await pubsub.punsubscribe("notify:*")
        await pubsub.close()


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(redis_subscriber_loop())
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task


app = FastAPI(
    title="Notification Service - Project Nexus",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.websocket("/api/v1/notify/ws")
async def notifications_ws(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        user = decode_token(token)
    except Exception:
        await websocket.close(code=1008)
        return

    user_id = str(user["user_id"])
    await manager.connect(user_id, websocket)

    try:
        while True:
            incoming = await websocket.receive_text()
            if incoming == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, websocket)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "notification-service"}
