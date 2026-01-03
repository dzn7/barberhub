"use client"

import React, { CSSProperties, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type BackgroundRippleEffectProps = {
  rows?: number
  cols?: number
  cellSize?: number
  className?: string
}

export const BackgroundRippleEffect: React.FC<BackgroundRippleEffectProps> = ({
  rows = 8,
  cols = 27,
  cellSize = 56,
  className,
}) => {
  const [clickedCell, setClickedCell] = useState<{ row: number; col: number } | null>(null)
  const [rippleKey, setRippleKey] = useState(0)
  const ref = useRef<HTMLDivElement | null>(null)

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-0 h-full w-full",
        "[--cell-border-color:var(--cell-border-light,rgba(255,255,255,0.08))]",
        "[--cell-fill-color:var(--cell-fill-light,rgba(255,255,255,0.03))]",
        "[--cell-shadow-color:rgba(0,0,0,0.35)]",
        "dark:[--cell-border-color:rgba(255,255,255,0.08)] dark:[--cell-fill-color:rgba(255,255,255,0.02)] dark:[--cell-shadow-color:rgba(0,0,0,0.6)]",
        className,
      )}
    >
      <div className="relative h-auto w-auto overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-[2] h-full w-full" />
        <DivGrid
          key={`base-${rippleKey}`}
          className="opacity-70"
          rows={rows}
          cols={cols}
          cellSize={cellSize}
          borderColor="var(--cell-border-color)"
          fillColor="var(--cell-fill-color)"
          clickedCell={clickedCell}
          onCellClick={(row, col) => {
            setClickedCell({ row, col })
            setRippleKey((k) => k + 1)
          }}
          interactive
        />
      </div>
    </div>
  )
}

type DivGridProps = {
  className?: string
  rows: number
  cols: number
  cellSize: number
  borderColor: string
  fillColor: string
  clickedCell: { row: number; col: number } | null
  onCellClick?: (row: number, col: number) => void
  interactive?: boolean
}

type CellStyle = CSSProperties & {
  ["--delay"]?: string
  ["--duration"]?: string
}

const DivGrid: React.FC<DivGridProps> = ({
  className,
  rows,
  cols,
  cellSize,
  borderColor,
  fillColor,
  clickedCell,
  onCellClick,
  interactive = true,
}) => {
  const cells = useMemo(() => Array.from({ length: rows * cols }, (_, idx) => idx), [rows, cols])

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`
      .trim(),
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`
      .trim(),
    width: cols * cellSize,
    height: rows * cellSize,
    marginInline: "auto",
  }

  return (
    <div className={cn("relative z-[1]", className)} style={gridStyle}>
      {cells.map((idx) => {
        const rowIdx = Math.floor(idx / cols)
        const colIdx = idx % cols
        const distance = clickedCell ? Math.hypot(clickedCell.row - rowIdx, clickedCell.col - colIdx) : 0
        const delay = clickedCell ? Math.max(0, distance * 55) : 0
        const duration = 200 + distance * 80

        const style: CellStyle = clickedCell
          ? {
              "--delay": `${delay}ms`,
              "--duration": `${duration}ms`,
            }
          : {}

        return (
          <div
            key={idx}
            className={cn(
              "cell relative opacity-40 transition-opacity duration-150 will-change-transform",
              "hover:opacity-70",
              clickedCell && "animate-cell-ripple [animation-fill-mode:none]",
              !interactive && "pointer-events-none",
            )}
            style={{
              backgroundColor: fillColor,
              borderColor,
              ...style,
            }}
            onClick={interactive ? () => onCellClick?.(rowIdx, colIdx) : undefined}
          />
        )
      })}
    </div>
  )
}
