"""One-ply greedy bot with a threat check on the opponent's reply."""

from __future__ import annotations

import random
from dataclasses import dataclass

from ..engine.apply import apply_move
from ..engine.models import GameState
from ..engine.moves import all_valid_moves
from .evaluate import WIN, evaluate


@dataclass(frozen=True)
class BotMove:
    piece_id: str
    to_row: int
    to_col: int
    score: float


def _worst_reply(state: GameState, me: int) -> float:
    """Value of the position after the opponent's best immediate reply (lower is worse for me)."""
    if state.game_over:
        return evaluate(state, me)
    worst = evaluate(state, me)
    for pid, moves in all_valid_moves(state).items():
        for m in moves:
            # Only captures and finishes can swing the evaluation sharply; skip quiet moves.
            if not (m.is_attack or m.can_finish):
                continue
            nxt = apply_move(state, pid, m.to_row, m.to_col)
            worst = min(worst, evaluate(nxt, me))
    return worst


def choose_move(state: GameState, rng: random.Random | None = None) -> BotMove | None:
    rng = rng or random.Random()
    me = state.current_turn
    candidates: list[BotMove] = []
    for pid, moves in all_valid_moves(state).items():
        for m in moves:
            nxt = apply_move(state, pid, m.to_row, m.to_col)
            value = evaluate(nxt, me)
            if value < WIN:
                # Blend the static value with the opponent's most damaging reply.
                value = 0.5 * value + 0.5 * _worst_reply(nxt, me)
            candidates.append(BotMove(pid, m.to_row, m.to_col, value))
    if not candidates:
        return None
    best = max(c.score for c in candidates)
    top = [c for c in candidates if c.score >= best - 1e-9]
    return rng.choice(top)
