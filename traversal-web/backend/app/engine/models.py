"""Plain dataclasses for the game state. JSON (de)serialisation via to_dict / from_dict."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

Board = list[list[int]]


class IllegalMoveError(ValueError):
    """Raised when a requested move is not in the piece's legal move list."""


class ArmyError(ValueError):
    """Raised when an army choice is invalid or submitted outside the army phase."""


@dataclass
class Piece:
    id: str
    type: str  # "explorer" | "vanguard" | "sentinel" | variant ("messenger")
    player: int  # 1 | 2
    row: int
    col: int
    movement: int
    strength: int
    is_captured: bool = False
    is_finished: bool = False

    @property
    def alive(self) -> bool:
        return not self.is_captured and not self.is_finished


@dataclass
class CombatBreakdown:
    """All the terms of a resolved (or offered) attack."""

    attacker_id: str
    attacker_type: str
    attacker_base: int
    height_mod: int  # +1 downhill, -1 uphill, 0 level
    allies: int  # sum of base strength of attacker's allies adjacent to the target
    charge: int  # +1 Vanguard charge when the minimal path costs exactly 4
    attacker_total: int
    defender_id: str
    defender_type: str
    defender_base: int
    reinforcements: int  # +1 per defender ally adjacent to the defender
    defender_total: int
    attacker_height: int
    defender_height: int


@dataclass
class Move:
    to_row: int
    to_col: int
    cost: int
    is_attack: bool = False
    captured_id: str | None = None
    can_finish: bool = False
    is_special: bool = False
    attacker_strength: int | None = None
    defender_strength: int | None = None
    combat: CombatBreakdown | None = None


@dataclass
class HistoryEntry:
    ply: int
    player: int
    piece_id: str
    piece_type: str
    from_row: int
    from_col: int
    to_row: int
    to_col: int
    is_attack: bool
    captured_id: str | None
    finished: bool
    is_special: bool
    notation: str
    cost: int = 0
    points: int = 0  # strength scored when the move finishes a piece
    combat: CombatBreakdown | None = None


@dataclass
class GameState:
    id: str
    board: Board
    pieces: list[Piece]
    mode: str = "local"  # "local" | "bot"
    bot_player: int | None = None
    terrain: str = "random"
    seed: int | None = None
    # With variants on, the game opens in the "army" phase: each player secretly picks, for each
    # piece, the classic type or its variant. Play starts once both armies are in.
    variants: bool = False
    phase: str = "play"  # "army" | "play"
    # Pending secret choices (piece id -> type) per player; None until submitted. Never sent to
    # clients as-is: the API only exposes whether each player is ready.
    army_choices: list[dict[str, str] | None] = field(default_factory=lambda: [None, None])
    version: int = 0
    current_turn: int = 1
    move_count: int = 0
    finished_pieces: list[str] = field(default_factory=list)
    first_to_finish: str | None = None
    game_over: bool = False
    winner: int | None = None  # 1 | 2 | 0 (draw) | None
    scores: list[int] = field(default_factory=lambda: [0, 0])
    draw_reason: str | None = None
    win_reason: str | None = None
    victory_type: str | None = None
    history: list[HistoryEntry] = field(default_factory=list)
    position_history: list[str] = field(default_factory=list)

    @property
    def size(self) -> int:
        return len(self.board)

    def piece(self, piece_id: str) -> Piece | None:
        for p in self.pieces:
            if p.id == piece_id:
                return p
        return None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> GameState:
        d = dict(d)
        d["pieces"] = [Piece(**p) for p in d.get("pieces", [])]
        history = []
        for h in d.get("history", []):
            h = dict(h)
            if h.get("combat"):
                h["combat"] = CombatBreakdown(**h["combat"])
            history.append(HistoryEntry(**h))
        d["history"] = history
        return cls(**d)
