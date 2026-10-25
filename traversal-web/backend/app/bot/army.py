"""The bot's secret army choice for games with variant pieces."""

from __future__ import annotations

import random

from ..engine.constants import VARIANT_OF
from ..engine.models import GameState

# Mean height step between neighbouring squares above which the Explorer's height-ignoring
# specials beat the Messenger's raw speed.
ROUGH_TERRAIN = 1.0


def terrain_roughness(state: GameState) -> float:
    board, size = state.board, state.size
    steps = [abs(board[r][c] - board[r][c + 1]) for r in range(size) for c in range(size - 1)]
    steps += [abs(board[r][c] - board[r + 1][c]) for r in range(size - 1) for c in range(size)]
    return sum(steps) / len(steps)


def choose_army(state: GameState, player: int, rng: random.Random | None = None) -> dict[str, str]:
    """Piece id -> type. Swaps one Explorer for a Messenger, more often on smooth terrain."""
    rng = rng or random.Random()
    want_messenger = 0.75 if terrain_roughness(state) < ROUGH_TERRAIN else 0.35
    army: dict[str, str] = {}
    explorers = [p for p in state.pieces if p.player == player and p.type == "explorer"]
    if explorers and rng.random() < want_messenger:
        army[rng.choice(explorers).id] = VARIANT_OF["explorer"]
    return army
