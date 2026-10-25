from app.engine.explain import explain_move

from .conftest import flat_board, make_state


def test_legal_move_reports_its_path(flat):
    s = make_state(flat, [("v", "vanguard", 1, 9, 3)])
    ex = explain_move(s, "v", 6, 3)
    assert ex.legal and ex.reason == "legal"
    assert ex.path == [(9, 3), (8, 3), (7, 3), (6, 3)] and ex.step_costs == [1, 1, 1]


def test_too_far_on_flat_ground(flat):
    s = make_state(flat, [("s", "sentinel", 1, 9, 3)])
    ex = explain_move(s, "s", 5, 3)
    assert not ex.legal and ex.reason == "too_far"
    assert ex.path_cost == 4 and ex.movement == 3


def test_too_far_because_of_a_climb():
    board = flat_board()
    board[8][3] = 2  # climbing costs 3, then descending costs 3
    board[8][2] = board[8][4] = 2
    s = make_state(board, [("v", "vanguard", 1, 9, 3)])
    ex = explain_move(s, "v", 7, 3)
    assert ex.reason == "too_far"
    assert ex.step_costs == [3, 3] and ex.path_cost == 6


def test_blocked_by_pieces_lists_blockers(flat):
    # Sentinel boxed in: the direct route is short but squares are occupied.
    s = make_state(
        flat,
        [
            ("s", "sentinel", 1, 9, 3),
            ("a", "explorer", 1, 8, 3),
            ("b", "explorer", 1, 9, 2),
            ("c", "explorer", 1, 9, 4),
        ],
    )
    ex = explain_move(s, "s", 7, 3)
    assert ex.reason == "blocked"
    assert ex.path_cost == 2 and ex.blockers == ["a"]
    assert ex.free_cost is None


def test_combat_too_weak_has_breakdown(flat):
    s = make_state(flat, [("e", "explorer", 1, 5, 3), ("t", "sentinel", 2, 4, 3)])
    ex = explain_move(s, "e", 4, 3)
    assert ex.reason == "combat_too_weak"
    assert ex.combat is not None
    assert ex.combat.attacker_total == 1 and ex.combat.defender_total == 3


def test_unreachable_enemy_still_shows_hypothetical_combat(flat):
    s = make_state(flat, [("s", "sentinel", 1, 9, 3), ("t", "explorer", 2, 2, 3)])
    ex = explain_move(s, "s", 2, 3)
    assert ex.reason == "too_far"
    assert ex.combat is not None and ex.combat.attacker_total >= ex.combat.defender_total


def test_vanguard_charge_counted_in_explanation(flat):
    s = make_state(flat, [("v", "vanguard", 1, 9, 3), ("t", "sentinel", 2, 5, 3)])
    ex = explain_move(s, "v", 5, 3)
    assert ex.legal and ex.combat is not None and ex.combat.charge == 1


def test_explorer_leap_blocked(flat):
    board = flat_board()
    board[8][3] = 2
    board[7][3] = 4
    s = make_state(board, [("e", "explorer", 1, 9, 3), ("x", "sentinel", 2, 8, 3)])
    # Walking to (7, 3) is too expensive, and the leap is blocked by the piece on (8, 3).
    ex = explain_move(s, "e", 7, 3)
    assert ex.reason == "leap_blocked" and ex.blockers == ["x"]


def test_own_piece_and_same_square(flat):
    s = make_state(flat, [("a", "explorer", 1, 9, 3), ("b", "explorer", 1, 9, 4)])
    assert explain_move(s, "a", 9, 4).reason == "own_piece"
    assert explain_move(s, "a", 9, 3).reason == "same_square"


def test_opponent_piece_is_hypothetical(flat):
    s = make_state(flat, [("a", "explorer", 1, 9, 3), ("b", "explorer", 2, 0, 3)], turn=1)
    ex = explain_move(s, "b", 1, 3)
    assert ex.hypothetical and ex.legal
