"""Initial game state. Port of `I()` in the reference engine."""

from __future__ import annotations

import uuid

from .constants import PIECE_STATS, START_LAYOUT
from .models import Board, GameState, Piece


def initial_pieces(size: int) -> list[Piece]:
    pieces: list[Piece] = []
    for player, row in ((1, size - 1), (2, 0)):
        for ptype, col in START_LAYOUT:
            stats = PIECE_STATS[ptype]
            pieces.append(
                Piece(
                    id=f"p{player}_{col}",
                    type=ptype,
                    player=player,
                    row=row,
                    col=col,
                    movement=stats["movement"],
                    strength=stats["strength"],
                )
            )
    return pieces


def new_game(
    board: Board,
    *,
    mode: str = "local",
    bot_player: int | None = None,
    terrain: str = "random",
    seed: int | None = None,
    game_id: str | None = None,
) -> GameState:
    return GameState(
        id=game_id or uuid.uuid4().hex,
        board=[list(row) for row in board],
        pieces=initial_pieces(len(board)),
        mode=mode,
        bot_player=bot_player,
        terrain=terrain,
        seed=seed,
    )
