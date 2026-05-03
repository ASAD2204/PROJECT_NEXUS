"""
LLM Manager — Multi-key rotation for Gemini + Groq APIs.

Strategy
--------
* Keys are loaded from comma-separated env vars: GEMINI_API_KEYS, GROQ_API_KEYS
* Each provider keeps a rotating index — round-robin on every call.
* On rate-limit / error the manager auto-advances to the next key and retries
  once before bubbling up the failure.
* Gemini is used for **embedding** and as a **generation fallback**.
* Groq (Llama-3.1-8b-instant) is the **primary generation** engine (fastest).
* If Groq exhausts all keys, it falls back to Gemini generation.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Key pool
# ---------------------------------------------------------------------------

@dataclass
class _KeyPool:
    """Thread-safe round-robin pool of API keys with cooldown tracking."""
    keys: list[str] = field(default_factory=list)
    _idx: int = 0
    _cooldowns: dict[int, float] = field(default_factory=dict)  # idx → timestamp when cooldown expires

    @property
    def size(self) -> int:
        return len(self.keys)

    def next(self) -> Optional[str]:
        """Return the next available key, skipping cooled-down ones."""
        if not self.keys:
            return None
        now = time.time()
        tried = 0
        while tried < self.size:
            idx = self._idx % self.size
            self._idx += 1
            if self._cooldowns.get(idx, 0) <= now:
                return self.keys[idx]
            tried += 1
        # All keys are on cooldown — return the first one anyway (best effort)
        self._idx += 1
        return self.keys[0]

    def cooldown_current(self, seconds: int = 60):
        """Put the most recently returned key on cooldown."""
        idx = (self._idx - 1) % self.size if self.size else 0
        self._cooldowns[idx] = time.time() + seconds
        logger.warning("Key #%d on cooldown for %ds", idx, seconds)


# ---------------------------------------------------------------------------
# Singleton manager
# ---------------------------------------------------------------------------

class LLMManager:
    """Manages multi-key rotation across Gemini and Groq providers."""

    def __init__(self):
        self._gemini_pool = _KeyPool()
        self._groq_pool = _KeyPool()
        self._initialized = False

    # -- Initialization -----------------------------------------------------

    def init(self, gemini_keys_csv: str = "", groq_keys_csv: str = ""):
        """Parse comma-separated key strings and populate pools."""
        self._gemini_pool = _KeyPool(
            keys=[k.strip() for k in gemini_keys_csv.split(",") if k.strip()]
        )
        self._groq_pool = _KeyPool(
            keys=[k.strip() for k in groq_keys_csv.split(",") if k.strip()]
        )
        logger.info(
            "LLMManager initialised — Gemini keys: %d, Groq keys: %d",
            self._gemini_pool.size,
            self._groq_pool.size,
        )
        self._initialized = True

    # -- Embedding (Gemini) -------------------------------------------------

    async def embed_text(self, text: str) -> Optional[list[float]]:
        """Get an embedding vector using Gemini text-embedding-004."""
        if not self._gemini_pool.size:
            return await self._embed_local(text)

        for _attempt in range(min(self._gemini_pool.size, 3)):
            key = self._gemini_pool.next()
            if not key:
                break
            try:
                return await asyncio.to_thread(self._gemini_embed_sync, key, text)
            except Exception as exc:
                logger.warning("Gemini embed failed (key rotation): %s", exc)
                self._gemini_pool.cooldown_current(60)

        # Fallback to local embedding
        return await self._embed_local(text)

    @staticmethod
    def _gemini_embed_sync(api_key: str, text: str) -> list[float]:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_query",
        )
        return result["embedding"]

    @staticmethod
    async def _embed_local(text: str) -> list[float]:
        """Fallback: use a lightweight hashed bag-of-words embedding."""
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        if not tokens:
            return [0.0] * 384

        vector_size = 384
        vector = [0.0] * vector_size
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % vector_size
            vector[index] += 1.0

        norm = sum(value * value for value in vector) ** 0.5
        if norm == 0:
            return vector
        return [value / norm for value in vector]

    # -- Generation (Groq primary → Gemini fallback) ------------------------

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> str:
        """Generate text — tries Groq first, falls back to Gemini."""
        # Try Groq
        if self._groq_pool.size:
            result = await self._try_groq(system_prompt, user_message, temperature, max_tokens)
            if result:
                return result

        # Fallback to Gemini
        if self._gemini_pool.size:
            result = await self._try_gemini_gen(system_prompt, user_message, temperature)
            if result:
                return result

        return (
            "I'm sorry, all AI providers are currently unavailable. "
            "Please try again in a few minutes or contact the admin office."
        )

    async def _try_groq(
        self, system_prompt: str, user_message: str,
        temperature: float, max_tokens: int,
    ) -> Optional[str]:
        for _attempt in range(min(self._groq_pool.size, 5)):
            key = self._groq_pool.next()
            if not key:
                break
            try:
                return await asyncio.to_thread(
                    self._groq_generate_sync,
                    key, system_prompt, user_message, temperature, max_tokens,
                )
            except Exception as exc:
                err_str = str(exc).lower()
                if "rate_limit" in err_str or "429" in err_str or "limit" in err_str:
                    logger.warning("Groq rate-limit hit, rotating key: %s", exc)
                    self._groq_pool.cooldown_current(60)
                else:
                    logger.error("Groq error: %s", exc)
                    self._groq_pool.cooldown_current(30)
        return None

    @staticmethod
    def _groq_generate_sync(
        api_key: str, system_prompt: str, user_message: str,
        temperature: float, max_tokens: int,
    ) -> str:
        from groq import Groq
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content

    async def _try_gemini_gen(
        self, system_prompt: str, user_message: str, temperature: float,
    ) -> Optional[str]:
        for _attempt in range(min(self._gemini_pool.size, 3)):
            key = self._gemini_pool.next()
            if not key:
                break
            try:
                return await asyncio.to_thread(
                    self._gemini_generate_sync,
                    key, system_prompt, user_message, temperature,
                )
            except Exception as exc:
                err_str = str(exc).lower()
                if "429" in err_str or "quota" in err_str or "limit" in err_str:
                    logger.warning("Gemini rate-limit, rotating: %s", exc)
                    self._gemini_pool.cooldown_current(60)
                else:
                    logger.error("Gemini generation error: %s", exc)
                    self._gemini_pool.cooldown_current(30)
        return None

    @staticmethod
    def _gemini_generate_sync(
        api_key: str, system_prompt: str, user_message: str, temperature: float,
    ) -> str:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            "gemini-2.0-flash",
            generation_config={"temperature": temperature},
        )
        response = model.generate_content([system_prompt, user_message])
        return response.text

    # -- Lightweight classify (for router) ----------------------------------

    async def classify(self, prompt: str) -> str:
        """Fast classification call — Groq preferred (low latency)."""
        return await self.generate(
            system_prompt=prompt,
            user_message="",
            temperature=0.0,
            max_tokens=50,
        )

    # -- Status / health ----------------------------------------------------

    def status(self) -> dict:
        return {
            "gemini_keys": self._gemini_pool.size,
            "groq_keys": self._groq_pool.size,
            "initialized": self._initialized,
        }


# Module-level singleton
llm_manager = LLMManager()
