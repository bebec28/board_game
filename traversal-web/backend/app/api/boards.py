from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..terrain import MAIN_MODES, TERRAIN_PRESETS, generate_board
from .schemas import GenerateBoardIn, GenerateBoardOut, TerrainOut

router = APIRouter(tags=["boards"])


@router.get("/terrains", response_model=list[TerrainOut])
def list_terrains(all: bool = False) -> list[TerrainOut]:
    ids = list(TERRAIN_PRESETS) if all else MAIN_MODES
    return [
        TerrainOut(id=p.id, label=p.label, description=p.description)
        for p in (TERRAIN_PRESETS[i] for i in ids)
    ]


@router.post("/boards/generate", response_model=GenerateBoardOut)
def generate(body: GenerateBoardIn) -> GenerateBoardOut:
    try:
        g = generate_board(body.mode, body.seed)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return GenerateBoardOut(board=g.board, seed=g.seed, mode=g.mode)
