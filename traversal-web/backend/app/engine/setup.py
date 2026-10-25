"""Initial game state. Port of `I()` in the reference engine."""

from __future__ import annotations

import copy
import uuid

from .constants import PIECE_STATS, START_LAYOUT, VARIANT_OF
from .models import ArmyError, Board, GameState, Piece


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
    variants: bool = False,
) -> GameState:
    return GameState(
        id=game_id or uuid.uuid4().hex,
        board=[list(row) for row in board],
        pieces=initial_pieces(len(board)),
        mode=mode,
        bot_player=bot_player,
        terrain=terrain,
        seed=seed,
        variants=variants,
        phase="army" if variants else "play",
    )


def submit_army(state: GameState, player: int, choices: dict[str, str]) -> GameState:
    """Record `player`'s secret army (piece id -> type; omitted pieces stay classic).

    When both players have submitted, every choice is revealed at once and play begins.
    """
    if state.phase != "army":
        raise ArmyError("armies are already chosen")
    if player not in (1, 2):
        raise ArmyError(f"unknown player {player}")
    if state.army_choices[player - 1] is not None:
        raise ArmyError("this army is already submitted")

    army: dict[str, str] = {}
    for pid, ptype in choices.items():
        piece = state.piece(pid)
        if piece is None or piece.player != player:
            raise ArmyError(f"{pid} is not one of your pieces")
        if ptype not in (piece.type, VARIANT_OF.get(piece.type)):
            raise ArmyError(f"{pid} cannot become a {ptype}")
        army[pid] = ptype

    new = copy.deepcopy(state)
    new.army_choices[player - 1] = army
    if all(c is not None for c in new.army_choices):
        for chosen in new.army_choices:
            for pid, ptype in (chosen or {}).items():
                piece = new.piece(pid)
                assert piece is not None
                piece.type = ptype
                piece.movement = PIECE_STATS[ptype]["movement"]
                piece.strength = PIECE_STATS[ptype]["strength"]
        new.phase = "play"
    new.version += 1
    return new
