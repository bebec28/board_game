from app.engine.moves import valid_moves

from .conftest import flat_board, make_state


def attack_at(moves, r, c):
    for m in moves:
        if m.is_attack and (m.to_row, m.to_col) == (r, c):
            return m
    return None


def test_attacker_wins_ties():
    s = make_state(flat_board(), [("p1_2", "sentinel", 1, 5, 5), ("p2_2", "sentinel", 2, 4, 5)])
    m = attack_at(valid_moves(s, "p1_2"), 4, 5)
    assert m is not None and m.captured_id == "p2_2"
    assert (m.attacker_strength, m.defender_strength) == (3, 3)


def test_weaker_attack_not_offered():
    s = make_state(flat_board(), [("p1_4", "explorer", 1, 5, 5), ("p2_3", "vanguard", 2, 4, 5)])
    assert attack_at(valid_moves(s, "p1_4"), 4, 5) is None


def test_downhill_bonus_lets_explorer_capture_vanguard():
    board = flat_board()
    board[5][5] = 2  # explorer on a hill
    s = make_state(board, [("p1_4", "explorer", 1, 5, 5), ("p2_3", "vanguard", 2, 4, 5)])
    m = attack_at(valid_moves(s, "p1_4"), 4, 5)
    assert m is not None and (m.attacker_strength, m.defender_strength) == (2, 2)


def test_uphill_penalty_rules_out_attack():
    board = flat_board()
    board[4][5] = 1  # defender uphill
    s = make_state(board, [("p1_3", "vanguard", 1, 5, 5), ("p2_3", "vanguard", 2, 4, 5)])
    assert attack_at(valid_moves(s, "p1_3"), 4, 5) is None
    # ...but still beats an Explorer uphill: 2 - 1 = 1 >= 1
    s2 = make_state(board, [("p1_3", "vanguard", 1, 5, 5), ("p2_4", "explorer", 2, 4, 5)])
    m = attack_at(valid_moves(s2, "p1_3"), 4, 5)
    assert m is not None and (m.attacker_strength, m.defender_strength) == (1, 1)


def test_hill_advantage_example_from_rules():
    # Red Vanguard on a hill attacks Blue Vanguard that has one adjacent reinforcement: 3 >= 3.
    board = flat_board()
    board[5][5] = 1
    s = make_state(board, [
        ("p1_3", "vanguard", 1, 5, 5),
        ("p2_3", "vanguard", 2, 4, 5),
        ("p2_4", "explorer", 2, 4, 6),  # reinforcement for the defender
    ])
    m = attack_at(valid_moves(s, "p1_3"), 4, 5)
    assert m is not None and (m.attacker_strength, m.defender_strength) == (3, 3)


def test_allied_assault_example_from_rules():
    # Red Explorer attacks Blue Sentinel; Red Vanguard adjacent to the target adds +2: 1 + 2 >= 3.
    s = make_state(flat_board(), [
        ("p1_4", "explorer", 1, 5, 5),
        ("p1_3", "vanguard", 1, 4, 6),
        ("p2_2", "sentinel", 2, 4, 5),
    ])
    m = attack_at(valid_moves(s, "p1_4"), 4, 5)
    assert m is not None and (m.attacker_strength, m.defender_strength) == (3, 3)
    # Without the ally the attack is impossible.
    s2 = make_state(flat_board(), [("p1_4", "explorer", 1, 5, 5), ("p2_2", "sentinel", 2, 4, 5)])
    assert attack_at(valid_moves(s2, "p1_4"), 4, 5) is None


def test_reinforcement_blocks_attack():
    # Blue Vanguard on a hill (2+1=3) vs Red Sentinel (3) -> capture; add an adjacent Red piece -> 4.
    board = flat_board()
    board[4][5] = 1
    base = [("p2_3", "vanguard", 2, 4, 5), ("p1_2", "sentinel", 1, 5, 5)]
    s = make_state(board, base, turn=2)
    assert attack_at(valid_moves(s, "p2_3"), 5, 5) is not None
    s2 = make_state(board, base + [("p1_4", "explorer", 1, 5, 6)], turn=2)
    assert attack_at(valid_moves(s2, "p2_3"), 5, 5) is None


def test_vanguard_charge_bonus_at_exact_cost_four():
    # Target exactly 4 flat squares away: 2 + 1 charge = 3 >= Sentinel 3.
    s = make_state(flat_board(), [("p1_3", "vanguard", 1, 9, 5), ("p2_2", "sentinel", 2, 5, 5)])
    m = attack_at(valid_moves(s, "p1_3"), 5, 5)
    assert m is not None and m.cost == 4 and m.attacker_strength == 3
    # Three squares away: no bonus, 2 < 3, not offered.
    s2 = make_state(flat_board(), [("p1_3", "vanguard", 1, 8, 5), ("p2_2", "sentinel", 2, 5, 5)])
    assert attack_at(valid_moves(s2, "p1_3"), 5, 5) is None


def test_vanguard_charge_uses_minimum_cost():
    # Straight path costs 3 (adjacent then one step? no) -> build: enemy 3 away with cheaper path.
    # Enemy at distance 3 flat: min cost 3 -> no bonus even though a 4-cost detour exists.
    s = make_state(flat_board(), [("p1_3", "vanguard", 1, 8, 5), ("p2_2", "sentinel", 2, 5, 5)])
    assert attack_at(valid_moves(s, "p1_3"), 5, 5) is None


def test_attack_through_blocked_path_uses_detour_cost():
    # Enemy adjacent north but a friendly piece sits... adjacency is direct, cost 1.
    # Enemy two north with a friend in between: must go around -> cost 4 for a Vanguard -> charge!
    s = make_state(flat_board(), [
        ("p1_3", "vanguard", 1, 7, 5),
        ("p1_4", "explorer", 1, 6, 5),
        ("p2_2", "sentinel", 2, 5, 5),
    ])
    m = attack_at(valid_moves(s, "p1_3"), 5, 5)
    # Path (7,5)->(7,4)->(6,4)->(5,4)->(5,5) costs 4 -> +1 -> 3 >= 3 (sentinel has no reinforcement;
    # the red explorer at (6,5) is adjacent to the target and adds +1 ally strength too -> 4).
    assert m is not None and m.cost == 4 and m.attacker_strength == 4


def test_combat_breakdown_recorded_in_history():
    from app.engine.apply import apply_move

    board = flat_board()
    board[5][5] = 1
    s = make_state(board, [
        ("p1_3", "vanguard", 1, 5, 5),
        ("p1_4", "explorer", 1, 4, 6),   # ally adjacent to the target: +1
        ("p2_2", "sentinel", 2, 4, 5),
        ("p2_4", "explorer", 2, 3, 5),   # reinforcement for the defender: +1
    ])
    m = attack_at(valid_moves(s, "p1_3"), 4, 5)
    assert m is not None and m.combat is not None
    b = m.combat
    assert (b.attacker_base, b.height_mod, b.allies, b.charge, b.attacker_total) == (2, 1, 1, 0, 4)
    assert (b.defender_base, b.reinforcements, b.defender_total) == (3, 1, 4)
    n = apply_move(s, "p1_3", 4, 5)
    h = n.history[-1]
    assert h.combat is not None and h.combat.defender_id == "p2_2" and h.cost == 2  # downhill step: |dh| + 1
    assert n.piece("p2_2").is_captured
