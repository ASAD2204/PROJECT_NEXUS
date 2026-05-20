"""
CAG Engine — Redis Semantic Cache with user-scoped isolation.
Enhanced for Hyper-Speed caching.
"""

from __future__ import annotations
import json
import hashlib
import logging
import time
from typing import Optional
import numpy as np

logger = logging.getLogger(__name__)

def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    return float(dot / (norm_a * norm_b)) if norm_a != 0 and norm_b != 0 else 0.0

class SemanticCache:
    CACHE_PREFIX = "ai:speed:"
    DEFAULT_TTL = 3600 # 1 hour for high-velocity session caching

    def __init__(self, redis_client, embed_fn, threshold: float = 0.92, ttl: int = DEFAULT_TTL):
        self.redis = redis_client
        self.embed_fn = embed_fn
        self.threshold = threshold
        self.ttl = ttl

    async def lookup(self, question: str, user_id: str, dynamic_threshold: Optional[float] = None) -> Optional[str]:
        """Hyper-speed lookup with dynamic threshold support."""
        threshold = dynamic_threshold or self.threshold
        query_vector = await self.embed_fn(question)
        if query_vector is None: return None
        query_vec_np = np.array(query_vector)

        if not self.redis: return None

        async for key in self.redis.scan_iter(match=f"{self.CACHE_PREFIX}{user_id}:*", count=50):
            raw = await self.redis.get(key)
            if not raw: continue
            try:
                data = json.loads(raw)
                if _cosine_similarity(query_vec_np, np.array(data["vector"])) >= threshold:
                    return data["answer"]
            except Exception: continue
        return None

    async def update(self, question: str, answer: str, user_id: str, tag: str = "general"):
        """Update cache with user-scoped key and semantic tag."""
        vector = await self.embed_fn(question)
        if vector:
            # Key format: prefix:user_id:tag:hash
            key = f"{self.CACHE_PREFIX}{user_id}:{tag}:{hashlib.md5(question.encode()).hexdigest()}"
            data = {"question": question, "vector": vector, "answer": answer, "tag": tag}
            await self.redis.set(key, json.dumps(data), ex=self.ttl)

    async def invalidate_tag(self, user_id: str, tag: str):
        """Wipe all cache entries for a specific tag (e.g. 'finance' after payment)."""
        if not self.redis: return
        async for key in self.redis.scan_iter(match=f"{self.CACHE_PREFIX}{user_id}:{tag}:*"):
            await self.redis.delete(key)
        logger.info(f"Invalidated context '{tag}' for user {user_id}")

    async def stats(self) -> dict:
        """Return basic cache health metrics."""
        count = 0
        if self.redis:
            async for _ in self.redis.scan_iter(match=f"{self.CACHE_PREFIX}*"):
                count += 1
        return {"cached_entries": count, "threshold": self.threshold}
