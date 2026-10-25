from app.engine.apply import apply_move
from app.engine.moves import valid_moves

from .conftest import flat_board, make_state


def finishes(moves):
    return [m for m in moves if m.can_finish]


def test_finish_requires_remaining_movement():
    # Sentinel (M3) at row 3: reaches row 0 with 0 left -> no finish from there.
    s = make_state(flat_board(), [("p1_2", "sentinel", 1, 3, 5)])
    assert finishes(valid_moves(s, "p1_2")) == []
    s2 = make_state(flat_board(), [("p1_2", "sentinel", 1, 2, 5)])
    f = finishes(valid_moves(s2, "p1_2"))
    assert [(m.to_row, m.to_col) for m in f] == [(-1, 5)]


def test_finish_from_final_row_and_dedup_per_column():
    s = make_state(flat_board(), [("p1_4", "explorer", 1, 0, 5)])
    f = finishes(valid_moves(s, "p1_4"))
    cols = sorted(m.to_col for m in f)
    assert cols == [1, 2, 3, 4, 5, 6, 7, 8, 9]  # columns reachable along row 0 with >= 1 left
    assert len(cols) == len(set(cols))


def test_player_two_finishes_off_bottom():
    s = make_state(flat_board(), [("p2_4", "explorer", 2, 8, 5)], turn=2)
    f = finishes(valid_moves(s, "p2_4"))
    assert all(m.to_row == 10 for m in f)


def test_finishing_scores_strength_and_removes_piece():
    s = make_state(flat_board(), [
        ("p1_3", "vanguard", 1, 1, 5),
        ("p1_2", "sentinel", 1, 9, 2),  # keeps red alive so elimination does not trigger
        ("p2_4", "explorer", 2, 5, 0),
    ])
    n = apply_move(s, "p1_3", -1, 5)
    p = n.piece("p1_3")
    assert p.is_finished and not p.alive
    assert n.scores == [2, 0]
    assert n.finished_pieces == ["p1_3"] and n.first_to_finish == "p1_3"
    assert not n.game_over
    assert n.history[-1].notation == "V f2-off"


def test_sentinel_first_to_finish_wins_instantly():
    s = make_state(flat_board(), [("p1_2", "sentinel", 1, 1, 5), ("p2_4", "explorer", 2, 5, 0)])
    n = apply_move(s, "p1_2", -1, 5)
    assert n.game_over and n.winner == 1 and n.win_reason == "sentinel_first"


def test_sentinel_second_to_finish_does_not_auto_win():
    s = make_state(flat_board(), [
        ("p1_2", "sentinel", 1, 1, 5),
        ("p2_4", "explorer", 2, 8, 0),
        ("p2_2", "sentinel", 2, 0, 9),
    ], turn=2)
    n = apply_move(s, "p2_4", 10, 0)  # blue explorer finishes first: 0-1
    assert not n.game_over and n.first_to_finish == "p2_4"
    n2 = apply_move(n, "p1_2", -1, 5)  # red sentinel finishes second: 3-1, game over on score
    assert n2.game_over and n2.winner == 1 and n2.win_reason == "score"
    assert n2.scores == [3, 1]


def test_two_finishes_equal_score_is_draw():
    s = make_state(flat_board(), [
        ("p1_4", "explorer", 1, 1, 5),
        ("p2_4", "explorer", 2, 8, 0),
        ("p1_2", "sentinel", 1, 9, 2),
        ("p2_2", "sentinel", 2, 0, 2),
    ])
    n = apply_move(s, "p1_4", -1, 5)
    n = apply_move(n, "p2_4", 10, 0)
    assert n.game_over and n.winner == 0 and n.draw_reason == "equal_score"
