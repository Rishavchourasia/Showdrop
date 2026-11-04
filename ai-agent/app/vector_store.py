"""
The VECTOR DATABASE (Qdrant).

A normal database answers "find rows WHERE city = 'Mumbai'" (exact match).
A vector database answers "find the 4 stored vectors CLOSEST to this one"
(meaning match). That's the "R" (Retrieval) in RAG.

Each stored item ("point") has:
  - id       a unique id
  - vector   the embedding (384 numbers)
  - payload  the original text + metadata (source file, event id, city...),
             which we can also FILTER on, e.g. only events in Mumbai.

We keep two "collections" (like tables):
  knowledge  chunks of our FAQ / policy documents
  events     one point per event, including its shows

Open http://localhost:6333/dashboard to browse them visually.
"""
import uuid

from qdrant_client import QdrantClient, models

from .config import settings
from .embeddings import VECTOR_SIZE, embed_documents, embed_query

KNOWLEDGE = "knowledge"
EVENTS = "events"

_client: QdrantClient | None = None


def client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.qdrant_url, timeout=10)
    return _client


def recreate_collection(name: str) -> None:
    """Drop and recreate a collection. Re-indexing from scratch keeps things simple and consistent."""
    c = client()
    if c.collection_exists(name):
        c.delete_collection(name)
    c.create_collection(
        name,
        # COSINE distance compares the DIRECTION of vectors, i.e. meaning, ignoring length.
        vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
    )


def point_id(*parts: object) -> str:
    """Deterministic id from content keys, so re-indexing the same thing overwrites instead of duplicating."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "/".join(map(str, parts))))


def upsert(collection: str, items: list[dict]) -> int:
    """items: [{"id": ..., "text": ..., "payload": {...}}]. Embeds the texts and stores them."""
    if not items:
        return 0
    vectors = embed_documents([i["text"] for i in items])
    client().upsert(
        collection,
        points=[
            models.PointStruct(id=i["id"], vector=v, payload={**i["payload"], "text": i["text"]})
            for i, v in zip(items, vectors)
        ],
    )
    return len(items)


def search(collection: str, query: str, limit: int, must: dict[str, str] | None = None) -> list[dict]:
    """
    Semantic search: embed the query, ask Qdrant for the nearest stored vectors.
    `must` adds exact-match payload filters, e.g. {"cities": "Mumbai"}
    (for a list field, it matches if ANY element equals the value).
    """
    query_filter = None
    if must:
        query_filter = models.Filter(must=[
            models.FieldCondition(key=k, match=models.MatchValue(value=v)) for k, v in must.items()
        ])
    hits = client().query_points(
        collection, query=embed_query(query), limit=limit, query_filter=query_filter, with_payload=True,
    ).points
    # score: cosine similarity, 1.0 = identical meaning, ~0 = unrelated
    return [{"score": round(h.score, 3), **(h.payload or {})} for h in hits]


def count(collection: str) -> int:
    c = client()
    return c.count(collection).count if c.collection_exists(collection) else 0
