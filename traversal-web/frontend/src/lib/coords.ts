export const BOARD_SIZE = 10
export const HEIGHT_UNIT = 0.35
export const BASE_HEIGHT = 0.3

/** Top surface height (world Y) of a square with terrain height `h`. */
export function topY(h: number): number {
  return BASE_HEIGHT + h * HEIGHT_UNIT
}

/** World X/Z of the centre of a square. Row 0 is at the far side (negative Z). */
export function squareXZ(row: number, col: number): [number, number] {
  return [col - (BOARD_SIZE - 1) / 2, row - (BOARD_SIZE - 1) / 2]
}

export function squareKey(row: number, col: number): string {
  return `${row},${col}`
}

export function isOffBoard(row: number): boolean {
  return row < 0 || row >= BOARD_SIZE
}
