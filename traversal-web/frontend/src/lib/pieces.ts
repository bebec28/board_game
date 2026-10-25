import type { ClassicPieceType, PieceType, Player, VariantPieceType } from '../api/types'

/**
 * 3D models served from frontend/public/pieces (one file per piece type and colour). Variant
 * pieces have no model yet and are drawn with their geometric shape.
 */
export const PIECE_MODELS: Partial<Record<PieceType, Record<Player, string>>> = {
  explorer: { 1: '/pieces/explorer_lantern.glb', 2: '/pieces/explorer_lantern_blue.glb' },
  vanguard: { 1: '/pieces/vanguard.glb', 2: '/pieces/vanguard_blue.glb' },
  sentinel: { 1: '/pieces/sentinel.glb', 2: '/pieces/sentinel_blue.glb' },
}

export const ALL_PIECE_MODEL_URLS = Object.values(PIECE_MODELS).flatMap((m) => [m[1], m[2]])

/** Classic piece -> the variant it can be swapped for (mirrors VARIANT_OF in the engine). */
export const VARIANT_OF: Partial<Record<ClassicPieceType, VariantPieceType>> = {
  explorer: 'messenger',
}

const VARIANT_TYPES = new Set<PieceType>(Object.values(VARIANT_OF))

export function isVariant(type: PieceType): boolean {
  return VARIANT_TYPES.has(type)
}

export const PIECE_INFO: Record<
  PieceType,
  { name: string; shape: string; movement: number; strength: number; special: string; letter: string }
> = {
  explorer: {
    name: 'Explorateur',
    shape: 'Cône pentagonal',
    movement: 5,
    strength: 1,
    letter: 'E',
    special:
      "Au lieu de son déplacement normal : 1 case en diagonale ou un saut de 2 cases en ligne droite, en ignorant la hauteur.",
  },
  vanguard: {
    name: 'Avant-garde',
    shape: 'Coin en losange',
    movement: 4,
    strength: 2,
    letter: 'V',
    special: "+1 en attaque quand il doit utiliser exactement ses 4 points de mouvement pour atteindre la cible.",
  },
  sentinel: {
    name: 'Sentinelle',
    shape: 'Prisme triangulaire',
    movement: 3,
    strength: 3,
    letter: 'S',
    special: "Si une Sentinelle est la toute première pièce à sortir du plateau, son camp gagne immédiatement.",
  },
  messenger: {
    name: 'Messager',
    shape: 'Hexagone tronqué',
    movement: 6,
    strength: 0,
    letter: 'M',
    special:
      "Ne peut pas attaquer. Sa sortie ne rapporte aucun point mais compte comme l'une des 2 sorties qui terminent la partie. Il ne peut sortir que s'il a commencé son tour sur la dernière rangée.",
  },
}
