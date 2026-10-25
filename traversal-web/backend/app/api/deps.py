from __future__ import annotations

from ..store import GameStore, InMemoryGameStore

_store: GameStore = InMemoryGameStore()


def get_store() -> GameStore:
    return _store
