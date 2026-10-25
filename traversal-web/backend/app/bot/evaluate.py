"""Static evaluation of a position from one player's point of view."""

from __future__ import annotations

from ..engine.combat import piece_at
from ..engine.constants import ORTHOGONAL
from ..engine.models import GameState

WIN = 1000.0


def evaluate(state: GameState, me: int) -> float:
    if state.game_over:
        if state.winner == me:
            return WIN
        if state.winner == 0 or state.winner is None:
            return 0.0
        return -WIN

    them = 2 if me == 1 else 1
    size = state.size
    score = 5.0 * (state.scores[me - 1] - state.scores[them - 1])

    material = 0.0
    advance = 0.0
    height = 0.0
    danger = 0.0
    for p in state.pieces:
        if not p.alive:
            continue
        sign = 1.0 if p.player == me else -1.0
        material += sign * 3.0 * p.strength
        progressed = (size - 1 - p.row) if p.player == 1 else p.row
        advance += sign * 0.4 * p.strength * progressed
        height += sign * 0.3 * state.board[p.row][p.col]
        if p.player == me:
            for dr, dc in ORTHOGONAL:
                r, c = p.row + dr, p.col + dc
                if 0 <= r < size and 0 <= c < size:
                    q = piece_at(state.pieces, r, c)
                    if q and q.player == them and q.strength > p.strength:
                        danger -= 1.0
    return score + material + advance + height + danger
