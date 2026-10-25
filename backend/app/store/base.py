"""Storage interface for game states. Swap the implementation for Redis/Postgres later."""

from __future__ import annotations

from typing import Protocol

from ..engine.models import GameState


class GameStore(Protocol):
    def get(self, game_id: str) -> GameState | None: ...

    def put(self, state: GameState) -> None: ...

    def delete(self, game_id: str) -> None: ...
