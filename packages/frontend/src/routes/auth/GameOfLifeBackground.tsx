import { useEffect, useRef, useCallback } from 'react'

const CELL_SIZE = 24
const ALIVE_PROBABILITY = 0.15
const TICK_MS = 140
const FADE_COLOR = 'rgba(0, 0, 0, 0.15)'
const MIN_ALIVE_RATIO = 0.1 // inject life if population drops below 3%
const INJECT_RADIUS = 5     // spawn a ~10×10 patch of random cells

export default function GameOfLifeBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const gridRef = useRef<Uint8Array | null>(null)
    const colsRef = useRef(0)
    const rowsRef = useRef(0)
    const rafRef = useRef<number>(0)
    const lastTickRef = useRef(0)
    const primaryColorRef = useRef<string>('#ffffff')

    // Initialize the grid with random alive cells
    const initGrid = useCallback((cols: number, rows: number): Uint8Array => {
        const grid = new Uint8Array(cols * rows)
        for (let i = 0; i < grid.length; i++) {
            grid[i] = Math.random() < ALIVE_PROBABILITY ? 1 : 0
        }
        return grid
    }, [])

    // Count alive neighbours (wrapping edges for seamless look)
    const countNeighbours = useCallback(
        (grid: Uint8Array, cols: number, rows: number, x: number, y: number) => {
            let count = 0
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue
                    const nx = (x + dx + cols) % cols
                    const ny = (y + dy + rows) % rows
                    count += grid[ny * cols + nx]
                }
            }
            return count
        },
        [],
    )

    // Compute next generation
    const nextGeneration = useCallback(
        (grid: Uint8Array, cols: number, rows: number): Uint8Array => {
            const next = new Uint8Array(cols * rows)
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = y * cols + x
                    const n = countNeighbours(grid, cols, rows, x, y)
                    if (grid[idx] === 1) {
                        next[idx] = n === 2 || n === 3 ? 1 : 0
                    } else {
                        next[idx] = n === 3 ? 1 : 0
                    }
                }
            }
            return next
        },
        [countNeighbours],
    )

    // Inject a random patch of cells to revive a dying grid
    const injectLife = useCallback(
        (grid: Uint8Array, cols: number, rows: number): void => {
            const cx = Math.floor(Math.random() * cols)
            const cy = Math.floor(Math.random() * rows)
            for (let dy = -INJECT_RADIUS; dy <= INJECT_RADIUS; dy++) {
                for (let dx = -INJECT_RADIUS; dx <= INJECT_RADIUS; dx++) {
                    const nx = (cx + dx + cols) % cols
                    const ny = (cy + dy + rows) % rows
                    if (Math.random() < ALIVE_PROBABILITY) {
                        grid[ny * cols + nx] = 1
                    }
                }
            }
        },
        [],
    )

    // Draw the current state
    const draw = useCallback(
        (ctx: CanvasRenderingContext2D, grid: Uint8Array, cols: number, rows: number) => {
            // Fade trail effect
            ctx.globalAlpha = 1
            ctx.fillStyle = FADE_COLOR
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

            // Set the color for cells
            ctx.fillStyle = primaryColorRef.current

            // We'll batch the paths for better performance
            ctx.beginPath() // Clear previous path just in case

            const corePath = new Path2D()

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if (grid[y * cols + x] === 1) {
                        // Add to core path
                        corePath.rect(
                            x * CELL_SIZE + 1,
                            y * CELL_SIZE + 1,
                            CELL_SIZE - 2,
                            CELL_SIZE - 2
                        )
                    }
                }
            }

           

            // Draw Core
            ctx.globalAlpha = 0.15
            ctx.fill(corePath)
        },
        [],
    )

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const resize = () => {
            const dpr = window.devicePixelRatio || 1
            const w = window.innerWidth
            const h = window.innerHeight

            canvas.width = w * dpr
            canvas.height = h * dpr
            canvas.style.width = `${w}px`
            canvas.style.height = `${h}px`
            ctx.scale(dpr, dpr)

            colsRef.current = Math.ceil(w / CELL_SIZE)
            rowsRef.current = Math.ceil(h / CELL_SIZE)

            // Initialize and skip a few generations to avoid chaotic start
            let grid = initGrid(colsRef.current, rowsRef.current)
            for (let i = 0; i < 20; i++) {
                grid = nextGeneration(grid, colsRef.current, rowsRef.current)
            }
            gridRef.current = grid

            // Get primary color from CSS variable
            const style = getComputedStyle(document.body)
            const primary = style.getPropertyValue('--accent-amber').trim()
            if (primary) {
                primaryColorRef.current = primary
            }

            // Clear with solid black on resize
            ctx.globalAlpha = 1
            ctx.fillStyle = '#000'
            ctx.fillRect(0, 0, w, h)
        }

        resize()
        window.addEventListener('resize', resize)

        const loop = (time: number) => {
            rafRef.current = requestAnimationFrame(loop)

            if (time - lastTickRef.current < TICK_MS) return
            lastTickRef.current = time

            if (!gridRef.current) return

            draw(ctx, gridRef.current, colsRef.current, rowsRef.current)
            gridRef.current = nextGeneration(gridRef.current, colsRef.current, rowsRef.current)

            // Revive the grid if population drops too low
            const total = colsRef.current * rowsRef.current
            let alive = 0
            for (let i = 0; i < total; i++) alive += gridRef.current[i]
            if (alive < total * MIN_ALIVE_RATIO) {
                injectLife(gridRef.current, colsRef.current, rowsRef.current)
            }
        }

        rafRef.current = requestAnimationFrame(loop)

        return () => {
            window.removeEventListener('resize', resize)
            cancelAnimationFrame(rafRef.current)
        }
    }, [initGrid, nextGeneration, draw, injectLife])

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-0"
            aria-hidden="true"
        />
    )
}
