"""
RAG Engine — ChromaDB + BM25 Ensemble Retriever with FlashRank Reranking.

Architecture (adapted from StudyBuddy reference):
1. ChromaDB vector search  (semantic)
2. BM25 keyword search     (lexical)
3. Reciprocal Rank Fusion  (merge)
4. FlashRank reranking     (precision)
5. Optional NLTK WordNet query expansion (recall)

Collections
-----------
* ``nexus_faq``              — university policies, FAQs, general knowledge
* ``nexus_course_materials`` — uploaded course PDFs / notes
* ``nexus_announcements``    — past announcements for context
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Query expansion via WordNet
# ---------------------------------------------------------------------------

def _ensure_nltk():
    """Download NLTK WordNet data if missing."""
    try:
        import nltk
        nltk.data.find("corpora/wordnet")
    except LookupError:
        import nltk
        nltk.download("wordnet", quiet=True)
        nltk.download("omw-1.4", quiet=True)


def expand_query(query: str) -> str:
    """Add WordNet synonyms to improve recall."""
    try:
        _ensure_nltk()
        from nltk.corpus import wordnet

        expanded = set()
        for word in query.split():
            expanded.add(word)
            for syn in wordnet.synsets(word):
                for lemma in syn.lemmas():
                    name = lemma.name()
                    if "_" not in name:
                        expanded.add(name)
        return " ".join(expanded)
    except Exception:
        return query


# ---------------------------------------------------------------------------
# Reciprocal Rank Fusion
# ---------------------------------------------------------------------------

@dataclass
class _ScoredDoc:
    content: str
    metadata: dict = field(default_factory=dict)
    rrf_score: float = 0.0


def reciprocal_rank_fusion(
    doc_lists: list[list[dict]],
    k: int = 60,
) -> list[dict]:
    """Merge multiple ranked lists using RRF (k=60 is the standard constant)."""
    scores: dict[str, _ScoredDoc] = {}
    for doc_list in doc_lists:
        for rank, doc in enumerate(doc_list):
            key = doc["content"]
            if key not in scores:
                scores[key] = _ScoredDoc(content=key, metadata=doc.get("metadata", {}))
            scores[key].rrf_score += 1.0 / (rank + k)

    sorted_docs = sorted(scores.values(), key=lambda d: d.rrf_score, reverse=True)
    return [{"content": d.content, "metadata": d.metadata, "score": d.rrf_score} for d in sorted_docs]


# ---------------------------------------------------------------------------
# FlashRank reranker
# ---------------------------------------------------------------------------

_reranker = None


def _get_reranker():
    global _reranker
    if _reranker is None:
        try:
            from flashrank import Ranker
            _reranker = Ranker(model_name="ms-marco-MiniLM-L-12-v2", cache_dir="/tmp/flashrank")
            logger.info("FlashRank reranker loaded")
        except Exception as exc:
            logger.warning("FlashRank unavailable, skipping reranking: %s", exc)
    return _reranker


def rerank_documents(query: str, documents: list[dict], top_k: int = 5) -> list[dict]:
    """Rerank documents using FlashRank cross-encoder."""
    ranker = _get_reranker()
    if ranker is None or not documents:
        return documents[:top_k]

    try:
        from flashrank import RerankRequest

        passages = [
            {"id": idx, "text": doc["content"], "meta": doc.get("metadata", {})}
            for idx, doc in enumerate(documents)
        ]
        request = RerankRequest(query=query, passages=passages)
        results = ranker.rerank(request)

        reranked = []
        for r in results[:top_k]:
            reranked.append({
                "content": r["text"],
                "metadata": r.get("meta", {}),
                "score": r["score"],
            })
        return reranked
    except Exception as exc:
        logger.warning("Reranking failed, returning original order: %s", exc)
        return documents[:top_k]


# ---------------------------------------------------------------------------
# RAG Engine class
# ---------------------------------------------------------------------------

class RAGEngine:
    """Hybrid retriever: ChromaDB (vector) + BM25 (keyword) + RRF + FlashRank."""

    # ChromaDB collections to search (FYP Tables 152-157)
    STATIC_COLLECTIONS = [
        "vectors_faq_knowledge",
        "vectors_university_policies",
    ]
    DYNAMIC_COLLECTIONS = [
        "vectors_course_materials",
        "vectors_student_transcripts",
    ]

    def __init__(self, chroma_host: str = "chromadb", chroma_port: int = 8000):
        self.chroma_host = chroma_host
        self.chroma_port = chroma_port
        self._bm25_docs: list[dict] = []
        self._bm25_retriever = None

    # -- ChromaDB vector search ---------------------------------------------

    def _search_chroma(
        self,
        query: str,
        query_vector: Optional[list[float]],
        role: str,
        user_id: str,
        top_k: int = 5,
    ) -> list[dict]:
        """Search ChromaDB collections and return document dicts."""
        results: list[dict] = []
        try:
            import chromadb
            client = chromadb.HttpClient(host=self.chroma_host, port=self.chroma_port)

            collections_to_search = list(self.STATIC_COLLECTIONS)
            # Students and faculty see course materials
            if role in ("student", "faculty"):
                collections_to_search.extend(self.DYNAMIC_COLLECTIONS)
            # Admin sees everything
            if role in ("admin", "superadmin"):
                collections_to_search.extend(self.DYNAMIC_COLLECTIONS)

            for coll_name in collections_to_search:
                try:
                    collection = client.get_collection(coll_name)

                    if query_vector:
                        res = collection.query(
                            query_embeddings=[query_vector],
                            n_results=top_k,
                        )
                    else:
                        res = collection.query(query_texts=[query], n_results=top_k)

                    if res and res.get("documents"):
                        for i, doc_text in enumerate(res["documents"][0]):
                            meta = res["metadatas"][0][i] if res.get("metadatas") else {}
                            results.append({"content": doc_text, "metadata": meta})
                except Exception as exc:
                    logger.debug("Skipping collection %s: %s", coll_name, exc)

        except Exception as exc:
            logger.warning("ChromaDB connection failed: %s", exc)
        return results

    # -- BM25 keyword search ------------------------------------------------

    def _search_bm25(self, query: str, documents: list[dict], top_k: int = 5) -> list[dict]:
        """BM25 keyword search over the same document set."""
        if not documents:
            return []
        try:
            from rank_bm25 import BM25Okapi

            corpus = [doc["content"].lower().split() for doc in documents]
            bm25 = BM25Okapi(corpus)
            tokenized_query = query.lower().split()
            scores = bm25.get_scores(tokenized_query)

            scored_docs = list(zip(scores, documents))
            scored_docs.sort(key=lambda x: x[0], reverse=True)
            return [doc for _, doc in scored_docs[:top_k]]
        except ImportError:
            logger.warning("rank_bm25 not installed, skipping BM25 search")
            return []
        except Exception as exc:
            logger.warning("BM25 search failed: %s", exc)
            return []

    # -- Public retrieval pipeline ------------------------------------------

    async def retrieve(
        self,
        query: str,
        query_vector: Optional[list[float]],
        role: str,
        user_id: str,
        top_k: int = 5,
    ) -> list[dict]:
        """Full retrieval pipeline: expand → search → fuse → rerank."""

        # 1. Query expansion
        expanded_query = expand_query(query)

        # 2. ChromaDB vector search
        import asyncio
        chroma_results = await asyncio.to_thread(
            self._search_chroma, expanded_query, query_vector, role, user_id, top_k
        )

        # 3. BM25 keyword search over same documents
        # We build BM25 over the chroma results + do a text search
        bm25_results = self._search_bm25(expanded_query, chroma_results, top_k)

        # 4. Reciprocal Rank Fusion
        if chroma_results and bm25_results:
            fused = reciprocal_rank_fusion([chroma_results, bm25_results])
        elif chroma_results:
            fused = chroma_results
        else:
            fused = bm25_results

        # 5. FlashRank reranking
        if fused:
            reranked = rerank_documents(query, fused, top_k=top_k)
            return reranked

        return []

    def format_context(self, documents: list[dict]) -> str:
        """Format retrieved documents into a context string for the LLM."""
        if not documents:
            return "No relevant documents found in the knowledge base."

        parts = []
        for i, doc in enumerate(documents, 1):
            source = doc.get("metadata", {}).get("source", "Knowledge Base")
            parts.append(f"[Source {i}: {source}]\n{doc['content']}")
        return "\n\n---\n\n".join(parts)
