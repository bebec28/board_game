import pytest

from app.engine.apply import apply_move, resign
from app.engine.models import IllegalMoveError

from .conftest import flat_board, make_state


def test_illegal_move_raises():
    s = make_state(flat_board(), [("p1_4", "explorer", 1, 5, 5)])
    with pytest.raises(IllegalMoveError):
        apply_move(s, "p1_4", 5, 5)
    with pytest.raises(IllegalMoveError):
        apply_move(s, "p1_4", 0, 0)


def test_attacker_moves_onto_captured_square():
    s = make_state(flat_board(), [("p1_2", "sentinel", 1, 5, 5), ("p2_4", "explorer", 2, 4, 5)])
    n = apply_move(s, "p1_2", 4, 5)
    assert n.piece("p2_4").is_captured
    assert (n.piece("p1_2").row, n.piece("p1_2").col) == (4, 5)
    assert n.current_turn == 2 and n.move_count == 1
    assert n.history[-1].notation == "S f6xf5"


def test_elimination_adds_max_strength_and_total_domination():
    s = make_state(flat_board(), [
        ("p1_2", "sentinel", 1, 5, 5),
        ("p1_4", "explorer", 1, 9, 0),
        ("p2_4", "explorer", 2, 4, 5),
    ])
    n = apply_move(s, "p1_2", 4, 5)
    assert n.game_over and n.winner == 1
    assert n.scores == [3, 0]  # red's strongest remaining piece
    assert n.victory_type == "total_domination"
    assert n.win_reason == "elimination"


def test_perfect_game_victory_type():
    s = make_state(flat_board(), [
        ("p1_3", "vanguard", 1, 1, 4),
        ("p1_2", "sentinel", 1, 1, 6),
        ("p2_4", "explorer", 2, 5, 0),
        ("p2_2", "sentinel", 2, 5, 9),
    ])
    n = apply_move(s, "p1_3", -1, 4)  # vanguard first (not a sentinel -> no instant win)
    n = apply_move(n, "p2_4", 6, 0)
    n = apply_move(n, "p1_2", -1, 6)  # sentinel second -> 5-0
    assert n.game_over and n.winner == 1 and n.victory_type == "perfect_game"


def _shuffle_state():
    return make_state(flat_board(), [
        ("p1_2", "sentinel", 1, 9, 2),
        ("p2_2", "sentinel", 2, 0, 2),
    ])


def test_threefold_repetition_draw():
    s = _shuffle_state()
    # Both players shuffle back and forth: positions repeat with period 4 plies.
    seq = [("p1_2", 8, 2), ("p2_2", 1, 2), ("p1_2", 9, 2), ("p2_2", 0, 2)]
    plies = 0
    for _ in range(4):
        for pid, r, c in seq:
            if s.game_over:
                break
            s = apply_move(s, pid, r, c)
            plies += 1
    assert s.game_over and s.winner == 0 and s.draw_reason == "threefold_repetition"
    # Position after ply 4 == start-of-cycle; three identical blocks of 4 need 12 plies.
    assert plies == 12


def test_move_limit_score_then_advancement_then_strength_then_draw():
    # Score tiebreak.
    s = _shuffle_state()
    s.move_count = 199
    n = apply_move(s, "p1_2", 8, 2)
    assert n.game_over and n.winner == 1 and n.win_reason == "move_limit_advancement"
    # Red sentinel at row 8 -> 8 rows left; blue at row 0 -> 9 rows left -> red wins by advancement.

    # Equal advancement, stronger piece wins.
    s2 = make_state(flat_board(), [
        ("p1_2", "sentinel", 1, 5, 2),
        ("p2_4", "explorer", 2, 3, 7),
    ])
    s2.move_count = 199
    n2 = apply_move(s2, "p1_2", 4, 2)  # red 4 rows left; blue explorer at row 3 -> 6 rows left
    assert n2.winner == 1
    s3 = make_state(flat_board(), [
        ("p1_4", "explorer", 1, 5, 2),
        ("p2_2", "sentinel", 2, 5, 7),
    ])
    s3.move_count = 199
    n3 = apply_move(s3, "p1_4", 4, 2)  # red explorer 4 left; blue sentinel 4 left -> stronger wins
    assert n3.winner == 2 and n3.win_reason == "move_limit_advancement"

    # Full symmetry -> draw.
    s4 = make_state(flat_board(), [
        ("p1_2", "sentinel", 1, 5, 2),
        ("p2_2", "sentinel", 2, 5, 7),
    ])
    s4.move_count = 199
    n4 = apply_move(s4, "p1_2", 5, 3)  # stays at 5 rows left; blue sentinel row 5 -> 4 left
    assert n4.winner == 2
    s5 = make_state(flat_board(), [
        ("p1_2", "sentinel", 1, 5, 2),
        ("p2_2", "sentinel", 2, 4, 7),
    ])
    s5.move_count = 199
    n5 = apply_move(s5, "p1_2", 5, 3)  # red 5 left, blue (row 4) 5 left, same strength -> draw
    assert n5.game_over and n5.winner == 0 and n5.draw_reason == "move_limit"


def test_move_limit_with_score_difference():
    s = make_state(flat_board(), [
        ("p1_4", "explorer", 1, 1, 5),
        ("p1_2", "sentinel", 1, 9, 2),
        ("p2_2", "sentinel", 2, 0, 7),
    ])
    s.move_count = 199
    n = apply_move(s, "p1_4", -1, 5)
    assert n.game_over and n.winner == 1 and n.win_reason == "move_limit_score"


def test_resign():
    s = _shuffle_state()
    n = resign(s, 1)
    assert n.game_over and n.winner == 2 and n.win_reason == "resignation"
    with pytest.raises(IllegalMoveError):
        resign(n, 2)
