import * as THREE from 'three'

/**
 * Piece motion between two square-top positions, shared by the in-game help and the tutorial.
 * - walk: hop to the next square (higher hop when climbing or dropping)
 * - bump: start towards the square, get stopped half way, come back (blocked / lost fight)
 * - jump: Explorer special, a high arc that ignores the terrain
 * - jumpBump: a jump that is stopped half way
 * - strike: lunge into an enemy square and back (a successful attack, the defender is removed)
 */
export type MotionKind = 'walk' | 'bump' | 'jump' | 'jumpBump' | 'strike'

export const MOTION_SECONDS: Record<MotionKind, number> = {
  walk: 0.5,
  bump: 0.75,
  jump: 0.8,
  jumpBump: 0.9,
  strike: 0.7,
}

const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2)

/** Position at progress `u` (0..1) of a motion from `a` to `b`, written into `out`. */
export function motionAt(kind: MotionKind, a: THREE.Vector3, b: THREE.Vector3, u: number, out: THREE.Vector3) {
  const t = Math.min(1, Math.max(0, u))
  switch (kind) {
    case 'walk': {
      const e = easeInOut(t)
      out.lerpVectors(a, b, e)
      const climb = Math.abs(b.y - a.y)
      out.y = THREE.MathUtils.lerp(a.y, b.y, e) + Math.sin(Math.PI * t) * (0.18 + climb * 0.6)
      return out
    }
    case 'jump': {
      const e = easeInOut(t)
      out.lerpVectors(a, b, e)
      out.y = THREE.MathUtils.lerp(a.y, b.y, e) + Math.sin(Math.PI * t) * 1.1
      return out
    }
    case 'bump':
    case 'jumpBump':
    case 'strike': {
      // Out to `reach`, then back. A strike goes all the way in before returning.
      const reach = kind === 'strike' ? 0.75 : 0.42
      const k = t < 0.55 ? easeInOut(t / 0.55) : 1 - easeInOut((t - 0.55) / 0.45)
      out.lerpVectors(a, b, k * reach)
      const lift = kind === 'jumpBump' ? 0.9 : 0.15 + Math.abs(b.y - a.y) * 0.4
      out.y = THREE.MathUtils.lerp(a.y, b.y, k * reach) + Math.sin(Math.PI * k) * lift
      // A little shake at the impact point.
      if (kind !== 'strike' && t > 0.45 && t < 0.65) out.x += Math.sin(t * 120) * 0.025
      return out
    }
  }
}
