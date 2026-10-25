import * as THREE from 'three'
import type { Player } from '../api/types'

export const PLAYER_COLORS: Record<Player, string> = { 1: '#e24a4a', 2: '#3b82f6' }
export const PLAYER_NAMES: Record<Player, string> = { 1: 'Rouge', 2: 'Bleu' }

// Height ramp: low lush ground -> grass -> rock -> snow. Indexed by terrain height.
const RAMP = ['#3f6b3a', '#5a8a3f', '#8a9a4a', '#a98a5a', '#9c8f84', '#c9c3bb', '#ece9e4']

export function heightColor(h: number): THREE.Color {
  const idx = Math.min(RAMP.length - 1, Math.max(0, h))
  return new THREE.Color(RAMP[idx])
}

export const HIGHLIGHT = {
  move: '#81b64c',
  attack: '#e24a4a',
  finish: '#f5c542',
  special: '#9b7bff',
  hover: '#ffffff',
}
