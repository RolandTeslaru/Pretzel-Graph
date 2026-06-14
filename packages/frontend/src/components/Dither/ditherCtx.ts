import { createDitherCtx } from './createDitherCtx'

/**
 * Shared module-level Dither WebGL context. Created once and reused wherever the
 * dither background is shown, so the canvas + GPU resources survive remounts and
 * route changes instead of being recreated. A single ctx owns one canvas and can
 * only be mounted in one place at a time — fine since these backgrounds are never
 * visible simultaneously.
 */
export const ditherCtx = createDitherCtx()
