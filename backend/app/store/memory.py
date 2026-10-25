from __future__ import annotations

import threading

from ..engine.models import GameState


class InMemoryGameStore:
    def __init__(self) -> None:
        self._games: dict[str, GameState] = {}
        self._lock = threading.Lock()

    def get(self, game_id: str) -> GameState | None:
        with self._lock:
            return self._games.get(game_id)

    def put(self, state: GameState) -> None:
        with self._lock:
            self._games[state.id] = state

    def delete(self, game_id: str) -> None:
        with self._lock:
            self._games.pop(game_id, None)
