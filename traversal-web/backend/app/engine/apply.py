"""Move application and game endings. Ports of `q`, `E`, `V`, `L`, `P` in the reference engine."""

from __future__ import annotations

import copy

from .constants import MOVE_LIMIT
from .models import GameState, HistoryEntry, IllegalMoveError, Move
from .moves import find_move
from .notation import move_notation


def compute_scores(state: GameState) -> list[int]:
    scores = [0, 0]
    for pid in state.finished_pieces:
        p = state.piece(pid)
        if p:
            scores[p.player - 1] += p.strength
    return scores


def position_key(state: GameState) -> str:
    alive = sorted(f"{p.player},{p.type},{p.row},{p.col}" for p in state.pieces if p.alive)
    finished = ",".join(sorted(state.finished_pieces))
    return f"{state.current_turn}|{';'.join(alive)}|{finished}"


def victory_type(state: GameState) -> str | None:
    if state.winner not in (1, 2):
        return None
    loser = 2 if state.winner == 1 else 1
    if not any(p.player == loser and p.alive for p in state.pieces):
        return "total_domination"
    winner_types: set[str] = set()
    opponent_finished = 0
    for pid in state.finished_pieces:
        p = state.piece(pid)
        if p is None:
            continue
        if p.player == state.winner:
            winner_types.add(p.type)
        else:
            opponent_finished += 1
    if opponent_finished == 0 and {"vanguard", "sentinel"} <= winner_types:
        return "perfect_game"
    return None


def _set_winner_by_score(state: GameState) -> None:
    if state.scores[0] > state.scores[1]:
        state.winner = 1
    elif state.scores[1] > state.scores[0]:
        state.winner = 2
    else:
        state.winner = 0


def resolve_move_limit(state: GameState) -> None:
    size = state.size
    state.game_over = True
    state.scores = compute_scores(state)
    if state.scores[0] != state.scores[1]:
        state.winner = 1 if state.scores[0] > state.scores[1] else 2
        state.win_reason = "move_limit_score"
        return

    def closest(player: int) -> tuple[int, int] | None:
        best: tuple[int, int] | None = None
        for p in state.pieces:
            if p.player != player or not p.alive:
                continue
            rows_left = p.row if player == 1 else size - 1 - p.row
            if best is None or rows_left < best[0] or (rows_left == best[0] and p.strength > best[1]):
                best = (rows_left, p.strength)
        return best

    def better(a: tuple[int, int] | None, b: tuple[int, int] | None) -> bool:
        return a is not None and (b is None or a[0] < b[0] or (a[0] == b[0] and a[1] > b[1]))

    c1, c2 = closest(1), closest(2)
    state.winner = 1 if better(c1, c2) else 2 if better(c2, c1) else 0
    if state.winner:
        state.win_reason = "move_limit_advancement"
    else:
        state.draw_reason = "move_limit"


def _check_repetition(state: GameState) -> bool:
    """Draw when the last f positions repeat three times in a row (f even). Mirrors the JS loop."""
    hist = state.position_history
    n = len(hist)
    f = 2
    while f <= n // 3:
        if n >= 3 * f:
            last, mid, first = hist[-f:], hist[-2 * f:-f], hist[-3 * f:-2 * f]
            if last == mid and mid == first:
                return True
        f += 2
    return False


def apply_move(state: GameState, piece_id: str, to_row: int, to_col: int) -> GameState:
    """Return a new GameState with the move applied. Raises IllegalMoveError."""
    if state.game_over:
        raise IllegalMoveError("game is over")
    piece = state.piece(piece_id)
    if piece is None:
        raise IllegalMoveError(f"unknown piece {piece_id}")
    move: Move | None = find_move(state, piece_id, to_row, to_col)
    if move is None:
        raise IllegalMoveError("move is not legal")

    size = state.size
    from_row, from_col = piece.row, piece.col
    notation = move_notation(piece, move, size)

    new = copy.deepcopy(state)
    mover = new.piece(piece_id)
    assert mover is not None

    if move.is_attack and move.captured_id:
        target = new.piece(move.captured_id)
        if target:
            target.is_captured = True

    finished = to_row < 0 or to_row >= size
    if finished:
        mover.row = 0 if mover.player == 1 else size - 1
        mover.col = to_col
        mover.is_finished = True
        new.finished_pieces.append(piece_id)
        new.scores = compute_scores(new)
        if new.first_to_finish is None:
            new.first_to_finish = piece_id
            if mover.type == "sentinel":
                new.game_over = True
                new.winner = mover.player
                new.win_reason = "sentinel_first"
    else:
        mover.row, mover.col = to_row, to_col

    if len(new.finished_pieces) >= 2 and not new.game_over:
        new.game_over = True
        _set_winner_by_score(new)
        if new.winner == 0:
            new.draw_reason = "equal_score"
        else:
            new.win_reason = "score"

    if not new.game_over:
        alive1 = [p for p in new.pieces if p.player == 1 and p.alive]
        alive2 = [p for p in new.pieces if p.player == 2 and p.alive]
        if not alive1 or not alive2:
            new.game_over = True
            bonus1 = max((p.strength for p in alive1), default=0)
            bonus2 = max((p.strength for p in alive2), default=0)
            new.scores = [new.scores[0] + bonus1, new.scores[1] + bonus2]
            _set_winner_by_score(new)
            if new.winner == 0:
                new.draw_reason = "elimination"
            else:
                new.win_reason = "elimination"

    if new.game_over and new.victory_type is None:
        new.victory_type = victory_type(new)

    new.current_turn = 2 if new.current_turn == 1 else 1
    new.move_count += 1

    if not new.game_over and new.move_count >= MOVE_LIMIT:
        resolve_move_limit(new)

    if not new.game_over:
        new.position_history.append(position_key(new))
        if _check_repetition(new):
            new.game_over = True
            new.winner = 0
            new.draw_reason = "threefold_repetition"
            new.scores = compute_scores(new)

    new.history.append(
        HistoryEntry(
            ply=new.move_count,
            player=piece.player,
            piece_id=piece_id,
            piece_type=piece.type,
            from_row=from_row,
            from_col=from_col,
            to_row=to_row,
            to_col=to_col,
            is_attack=move.is_attack,
            captured_id=move.captured_id,
            finished=finished,
            is_special=move.is_special,
            notation=notation,
            cost=move.cost,
            points=piece.strength if finished else 0,
            combat=move.combat,
        )
    )
    new.version += 1
    return new


def resign(state: GameState, player: int) -> GameState:
    if state.game_over:
        raise IllegalMoveError("game is over")
    new = copy.deepcopy(state)
    new.game_over = True
    new.winner = 2 if player == 1 else 1
    new.win_reason = "resignation"
    new.scores = compute_scores(new)
    new.version += 1
    return new
