"""
EMBEDDINGS: turning text into vectors (lists of numbers).

The key idea of RAG: texts with similar MEANING get vectors that are close
together, even if they share no words.
    "Can I get my money back?"   ->  [0.12, -0.03, 0.88, ...]
    "refund policy"              ->  [0.10, -0.01, 0.85, ...]   <- close!
    "parking at the venue"       ->  [-0.70, 0.44, 0.02, ...]   <- far away

We use fastembed (ONNX, CPU-only) so this runs locally for free. The model is
downloaded once (~130MB) and cached.
"""
from functools import lru_cache

from fastembed import TextEmbedding

from .config import settings

VECTOR_SIZE = 384  # bge-small produces 384 numbers per text


@lru_cache(maxsize=1)  # load the model once per process; it takes a second or two
def _model() -> TextEmbedding:
    return TextEmbedding(settings.embedding_model, cache_dir=settings.embedding_cache_dir)


def embed_documents(texts: list[str]) -> list[list[float]]:
    """Embed the texts we STORE (knowledge chunks, event descriptions)."""
    return [v.tolist() for v in _model().passage_embed(texts)]


def embed_query(text: str) -> list[float]:
    """Embed a SEARCH query. bge models use a slightly different prefix for queries."""
    return next(iter(_model().query_embed(text))).tolist()
