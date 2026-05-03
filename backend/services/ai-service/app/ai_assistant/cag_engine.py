"""
CAG Engine — Redis Semantic Cache with Cosine Similarity.

Adapted from StudyBuddy's semantic cache pattern:
* Embeds every question with all-MiniLM-L6-v2 (or Gemini).
* Stores (vector, answer) pairs in Redis with 24h TTL.
* On lookup, computes cosine similarity against all cached vectors.
* If similarity > threshold (0.90), returns cached answer instantly.
* Includes local RAM fallback if Redis is unreachable.
"""

from __future__ import annotations

import json
import hashlib
import logging
import time
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cosine similarity helper
# ---------------------------------------------------------------------------

def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two vectors."""
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


# ---------------------------------------------------------------------------
# Semantic Cache
# ---------------------------------------------------------------------------

class SemanticCache:
    """Redis-backed semantic cache with cosine-similarity lookup."""

    CACHE_PREFIX = "ai:cag:"
    DEFAULT_TTL = 86400  # 24 hours
    DEFAULT_THRESHOLD = 0.90

    def __init__(
        self,
        redis_client,
        embed_fn,
        threshold: float = DEFAULT_THRESHOLD,
        ttl: int = DEFAULT_TTL,
    ):
        """
        Parameters
        ----------
        redis_client : redis.asyncio client (or None for RAM-only mode)
        embed_fn : async callable(text) → list[float]
        threshold : cosine similarity threshold for a cache hit
        ttl : time-to-live for cached entries in seconds
        """
        self.redis = redis_client
        self.embed_fn = embed_fn
        self.threshold = threshold
        self.ttl = ttl

        # Local fallback
        self._local_vectors: list[np.ndarray] = []
        self._local_data: list[dict] = []

    # -- Lookup -------------------------------------------------------------

    async def lookup(self, question: str) -> Optional[str]:
        """Check if a semantically similar question was answered before."""
        query_vector = await self.embed_fn(question)
        if query_vector is None:
            return None

        query_vec_np = np.array(query_vector)

        # A. Redis lookup
        if self.redis:
            try:
                return await self._redis_lookup(query_vec_np)
            except Exception as exc:
                logger.warning("Redis cache lookup failed: %s", exc)

        # B. Local RAM lookup
        return self._local_lookup(query_vec_np)

    async def _redis_lookup(self, query_vec: np.ndarray) -> Optional[str]:
        """Scan Redis for a semantically similar cached entry."""
        keys = []
        async for key in self.redis.scan_iter(match=f"{self.CACHE_PREFIX}*", count=100):
            keys.append(key)

        if not keys:
            return None

        best_sim = 0.0
        best_answer = None

        # Process in batches to avoid memory issues
        for key in keys:
            raw = await self.redis.get(key)
            if not raw:
                continue
            try:
                data = json.loads(raw)
                cached_vec = np.array(data["vector"])
                sim = _cosine_similarity(query_vec, cached_vec)
                if sim > best_sim:
                    best_sim = sim
                    best_answer = data["answer"]
            except (json.JSONDecodeError, KeyError):
                continue

        if best_sim >= self.threshold:
            logger.info("CAG cache HIT (similarity=%.3f)", best_sim)
            return best_answer

        return None

    def _local_lookup(self, query_vec: np.ndarray) -> Optional[str]:
        """Check local RAM cache."""
        if not self._local_vectors:
            return None

        sims = [_cosine_similarity(query_vec, v) for v in self._local_vectors]
        best_idx = int(np.argmax(sims))

        if sims[best_idx] >= self.threshold:
            logger.info("CAG local cache HIT (similarity=%.3f)", sims[best_idx])
            return self._local_data[best_idx]["answer"]
        return None

    # -- Update -------------------------------------------------------------

    async def update(self, question: str, answer: str):
        """Store a new (question, answer) pair in the cache."""
        vector = await self.embed_fn(question)
        if vector is None:
            return

        data = {
            "question": question,
            "vector": vector,
            "answer": answer,
            "timestamp": time.time(),
        }

        # Redis
        if self.redis:
            try:
                key = f"{self.CACHE_PREFIX}{hashlib.md5(question.encode()).hexdigest()}"
                await self.redis.set(key, json.dumps(data), ex=self.ttl)
                return
            except Exception as exc:
                logger.warning("Redis cache write failed: %s", exc)

        # Local fallback
        self._local_vectors.append(np.array(vector))
        self._local_data.append({"question": question, "answer": answer})

    # -- Clear --------------------------------------------------------------

    async def clear(self, user_id: Optional[str] = None):
        """Wipe cached entries."""
        if self.redis:
            try:
                async for key in self.redis.scan_iter(match=f"{self.CACHE_PREFIX}*"):
                    await self.redis.delete(key)
            except Exception as exc:
                logger.warning("Redis cache clear failed: %s", exc)
        self._local_vectors = []
        self._local_data = []

    # -- Stats --------------------------------------------------------------

    async def stats(self) -> dict:
        count = 0
        if self.redis:
            try:
                async for _ in self.redis.scan_iter(match=f"{self.CACHE_PREFIX}*"):
                    count += 1
            except Exception:
                pass
        count += len(self._local_data)
        return {
            "cached_entries": count,
            "threshold": self.threshold,
            "ttl_seconds": self.ttl,
        }
