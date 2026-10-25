from app.engine.moves import valid_moves
from app.engine.setup import new_game

from .conftest import flat_board, make_state, targets


def test_flat_range_is_manhattan_without_start():
    s = make_state(flat_board(), [("p1_4", "explorer", 1, 5, 5)])
    mv = valid_moves(s, "p1_4")
    dests = targets(mv)
    assert (5, 5) not in dests
    for r in range(10):
        for c in range(10):
            d = abs(r - 5) + abs(c - 5)
            assert ((r, c) in dests) == (0 < d <= 5)
    assert all(m.cost == abs(m.to_row - 5) + abs(m.to_col - 5) for m in mv)


def test_cannot_pass_through_pieces():
    # Sentinel (M3) at (5,5); friendly piece at (4,5) blocks the straight path north.
    s = make_state(flat_board(), [("p1_2", "sentinel", 1, 5, 5), ("p1_3", "vanguard", 1, 4, 5)])
    dests = targets(valid_moves(s, "p1_2"))
    assert (4, 5) not in dests
    assert (3, 5) not in dests  # would need 4 steps around the blocker
    assert (2, 5) not in dests


def test_climb_costs_height_plus_one():
    board = flat_board()
    for c in range(10):
        board[4][c] = 2  # ridge two units high just north of row 5
    s = make_state(board, [("p1_2", "sentinel", 1, 5, 5)])
    mv = {(m.to_row, m.to_col): m for m in valid_moves(s, "p1_2")}
    assert (4, 5) in mv and mv[(4, 5)].cost == 3
    assert (3, 5) not in mv  # no movement left after climbing
    assert (5, 2) in mv and (5, 8) in mv  # 3 flat steps sideways


def test_descent_costs_the_same_as_climb():
    board = flat_board()
    for c in range(10):
        board[5][c] = 2
        board[4][c] = 1
    s = make_state(board, [("p1_3", "vanguard", 1, 5, 5)])
    mv = {(m.to_row, m.to_col): m for m in valid_moves(s, "p1_3")}
    assert mv[(4, 5)].cost == 2
    assert mv[(3, 5)].cost == 4
    assert (2, 5) not in mv


def test_only_current_player_can_move():
    s = make_state(flat_board(), [("p2_4", "explorer", 2, 0, 4)], turn=1)
    assert valid_moves(s, "p2_4") == []


def test_initial_setup_matches_reference():
    g = new_game(flat_board())
    ids = [p.id for p in g.pieces]
    assert ids == ["p1_2", "p1_3", "p1_4", "p1_5", "p1_6", "p1_7",
                   "p2_2", "p2_3", "p2_4", "p2_5", "p2_6", "p2_7"]
    assert all(p.row == 9 for p in g.pieces if p.player == 1)
    assert all(p.row == 0 for p in g.pieces if p.player == 2)
    assert [p.type for p in g.pieces[:6]] == [
        "sentinel", "vanguard", "explorer", "explorer", "vanguard", "sentinel"
    ]
    assert all(p.movement + p.strength == 6 for p in g.pieces)
