"""Pydantic request/response models. Response shapes mirror the engine dataclasses."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

TerrainMode = str
GameMode = Literal["local", "bot"]


class PieceOut(BaseModel):
    id: str
    type: str
    player: int
    row: int
    col: int
    movement: int
    strength: int
    is_captured: bool
    is_finished: bool


class CombatOut(BaseModel):
    attacker_id: str
    attacker_type: str
    attacker_base: int
    height_mod: int
    allies: int
    charge: int
    attacker_total: int
    defender_id: str
    defender_type: str
    defender_base: int
    reinforcements: int
    defender_total: int
    attacker_height: int
    defender_height: int


class MoveOut(BaseModel):
    to_row: int
    to_col: int
    cost: int
    is_attack: bool
    captured_id: str | None
    can_finish: bool
    is_special: bool
    attacker_strength: int | None
    defender_strength: int | None
    combat: CombatOut | None = None


class HistoryEntryOut(BaseModel):
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
    points: int = 0
    combat: CombatOut | None = None


class GameStateOut(BaseModel):
    id: str
    version: int
    mode: GameMode
    bot_player: int | None
    terrain: str
    seed: int | None
    variants: bool
    phase: Literal["army", "play"]
    # Whether each player has submitted their (secret) army.
    army_ready: list[bool]
    board: list[list[int]]
    pieces: list[PieceOut]
    current_turn: int
    move_count: int
    finished_pieces: list[str]
    first_to_finish: str | None
    game_over: bool
    winner: int | None
    scores: list[int]
    draw_reason: str | None
    win_reason: str | None
    victory_type: str | None
    history: list[HistoryEntryOut]


class CreateGameIn(BaseModel):
    terrain: TerrainMode = "random"
    mode: GameMode = "local"
    bot_player: int | None = Field(default=None, ge=1, le=2)
    seed: int | None = None
    variants: bool = False


class ArmyIn(BaseModel):
    player: int = Field(ge=1, le=2)
    # Piece id -> chosen type; omitted pieces stay classic.
    choices: dict[str, str] = Field(default_factory=dict)


class PlayMoveIn(BaseModel):
    piece_id: str
    to_row: int
    to_col: int


class MoveResultOut(BaseModel):
    state: GameStateOut
    applied: HistoryEntryOut


class ResignIn(BaseModel):
    player: int = Field(ge=1, le=2)


class GenerateBoardIn(BaseModel):
    mode: TerrainMode = "random"
    seed: int | None = None


class GenerateBoardOut(BaseModel):
    board: list[list[int]]
    seed: int
    mode: str


class TerrainOut(BaseModel):
    id: str
    label: str
    description: str


class ExplanationOut(BaseModel):
    piece_id: str
    to_row: int
    to_col: int
    reason: str
    legal: bool
    movement: int
    hypothetical: bool
    path: list[tuple[int, int]]
    step_costs: list[int]
    path_cost: int | None
    free_path: list[tuple[int, int]]
    free_cost: int | None
    blockers: list[str]
    occupant_id: str | None
    is_special: bool
    combat: CombatOut | None = None


class HintOut(BaseModel):
    piece_id: str
    to_row: int
    to_col: int
