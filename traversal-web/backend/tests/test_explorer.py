from app.engine.moves import valid_moves

from .conftest import flat_board, make_state


def specials(moves):
    return {(m.to_row, m.to_col): m for m in moves if m.is_special}


def test_specials_only_when_not_normally_reachable():
    # On flat ground every diagonal and leap square is reachable normally -> no specials.
    s = make_state(flat_board(), [("p1_4", "explorer", 1, 5, 5)])
    assert specials(valid_moves(s, "p1_4")) == {}


def test_diagonal_step_ignores_height():
    board = flat_board()
    # Surround (5,5) with a wall of height 2 except the diagonal target is also 2 ... make all
    # neighbours cost 3 and the diagonal unreachable within 5 normally by using height 4 further on.
    for r in range(10):
        for c in range(10):
            if (r, c) != (5, 5):
                board[r][c] = 2
    board[4][4] = 4  # diagonal target: 2 steps of cost 3 each = 6 > 5 normally
    board[3][4] = board[4][3] = 4
    s = make_state(board, [("p1_4", "explorer", 1, 5, 5)])
    sp = specials(valid_moves(s, "p1_4"))
    assert (4, 4) in sp and sp[(4, 4)].cost == 5


def test_leap_requires_empty_middle_square():
    board = flat_board()
    for c in range(10):
        board[4][c] = 2
        board[3][c] = 4  # (3,5) costs 3 + 3 = 6 normally -> only reachable by leap
    s = make_state(board, [("p1_4", "explorer", 1, 5, 5)])
    assert (3, 5) in specials(valid_moves(s, "p1_4"))
    blocked = make_state(board, [("p1_4", "explorer", 1, 5, 5), ("p2_4", "explorer", 2, 4, 5)])
    assert (3, 5) not in specials(valid_moves(blocked, "p1_4"))


def test_special_attack_uses_normal_strength_without_charge():
    board = flat_board()
    for c in range(10):
        board[4][c] = 2
        board[3][c] = 4
    # Enemy explorer on (3,5): special attack 1 - 1 (uphill) = 0 < 1 -> not offered.
    s = make_state(board, [("p1_4", "explorer", 1, 5, 5), ("p2_4", "explorer", 2, 3, 5)])
    assert (3, 5) not in specials(valid_moves(s, "p1_4"))
    # Flatten: target at same height but still unreachable normally because of a blocker? Use allies:
    s2 = make_state(board, [
        ("p1_4", "explorer", 1, 5, 5),
        ("p2_4", "explorer", 2, 3, 5),
        ("p1_3", "vanguard", 1, 3, 4),  # ally adjacent to target: +2 -> 1 - 1 + 2 = 2 >= 1
    ])
    m = specials(valid_moves(s2, "p1_4")).get((3, 5))
    assert m is not None and m.is_attack and m.captured_id == "p2_4"


def test_special_not_offered_when_failed_normal_attack_exists():
    # Enemy sentinel adjacent diagonally is reachable normally via two steps; even though the normal
    # attack fails (1 < 3) the square is in `attacks`, so no special is generated for it.
    s = make_state(flat_board(), [("p1_4", "explorer", 1, 5, 5), ("p2_2", "sentinel", 2, 4, 4)])
    assert (4, 4) not in specials(valid_moves(s, "p1_4"))


def test_leap_off_board_forward_is_a_finish():
    board = flat_board()
    for c in range(10):
        board[0][c] = 4  # top row unreachable normally from height 0 at row 1 (cost 5 > ... = 5 ok)
    board[0][5] = 5  # cost 6 -> unreachable normally
    s = make_state(board, [("p1_4", "explorer", 1, 1, 5)])
    mv = valid_moves(s, "p1_4")
    finishes = [m for m in mv if m.can_finish]
    # Leap of 2 north from row 1 lands at row -1 -> finish via special; the middle (0,5) is empty.
    assert any(m.to_row == -1 and m.to_col == 5 and m.is_special for m in finishes)
