"""
All settings in one place, read from environment variables.

WHY pydantic-settings? Same idea as Spring's application.yml with ${ENV:default}:
the defaults work when you run on your Mac; Docker/Kubernetes override them
with env vars. It also validates types (e.g. a port must be an int).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Reads a .env file too, so you can keep LLM_API_KEY out of your shell history.
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    # --- LLM ---
    # Both come from the environment / .env file (see .env.example), never from code.
    llm_api_key: str = ""
    agent_model: str = ""
    # Effort = how hard the model thinks. "medium" is plenty for a booking chat.
    agent_effort: str = "medium"
    # Safety net so a confused agent can't loop forever (each loop = one API call = money).
    agent_max_steps: int = 8

    # --- Other services ---
    backend_url: str = "http://localhost:8080"     # the Java Spring Boot API
    qdrant_url: str = "http://localhost:6333"      # the vector database
    redis_host: str = "localhost"                  # conversation memory
    redis_port: int = 6379

    # --- RAG ---
    # A small, fast embedding model that runs locally on the CPU (no API key, no cost).
    # It turns text into a list of 384 numbers ("a vector") that captures its meaning.
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_cache_dir: str | None = None
    knowledge_dir: str = "knowledge"
    rag_top_k: int = 4

    # How long a conversation is remembered (seconds).
    conversation_ttl: int = 3600


settings = Settings()
