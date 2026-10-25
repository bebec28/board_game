"""Game constants. Mirrors the official local engine (docs/reference/localGameEngine.reference.js)."""

BOARD_SIZE = 10
MOVE_LIMIT = 200

# Movement + Strength always equals 6.
PIECE_STATS: dict[str, dict[str, int]] = {
    "explorer": {"movement": 5, "strength": 1},
    "vanguard": {"movement": 4, "strength": 2},
    "sentinel": {"movement": 3, "strength": 3},
}

# (type, column) for each piece; identical for both players.
START_LAYOUT: list[tuple[str, int]] = [
    ("sentinel", 2),
    ("vanguard", 3),
    ("explorer", 4),
    ("explorer", 5),
    ("vanguard", 6),
    ("sentinel", 7),
]

ORTHOGONAL = ((-1, 0), (1, 0), (0, -1), (0, 1))

# Explorer specials: 4 diagonal steps + 4 orthogonal leaps of 2.
EXPLORER_SPECIALS = ((-1, -1), (-1, 1), (1, -1), (1, 1), (-2, 0), (0, -2), (2, 0), (0, 2))

PLAYER_NAMES = {1: "Red", 2: "Blue"}
