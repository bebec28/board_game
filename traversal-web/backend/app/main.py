from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import boards, games

DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


def create_app() -> FastAPI:
    app = FastAPI(title="Traversal API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=DEV_ORIGINS,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(games.router, prefix="/api")
    app.include_router(boards.router, prefix="/api")

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
