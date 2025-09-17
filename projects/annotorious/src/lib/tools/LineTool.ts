// src/tools/LineTool.ts

import { v4 as uuid } from 'uuid'
import { Geometry, Point } from '../types/shape.types'
import LineShape from '../shapes/LineShape'
import { Tool } from './base/Tool';

export class LineTool extends Tool {
  override capabilities = { supportsMouse: true }
  override name = 'line'

  private svg: SVGSVGElement
  private currentShape: LineShape | null = null
  private points: Point[] = []
  private isCurrentlyDrawing = false
  private onComplete: (shape: LineShape) => void
  private minPoints = 2
  private snapDistance = 20
  private doubleClickTimeout: number | null = null

  constructor(
    svg: SVGSVGElement,
    onComplete: (shape: LineShape) => void,
    imageBounds: { naturalWidth: number; naturalHeight: number }
  ) {
    super(imageBounds)
    this.svg = svg
    this.onComplete = onComplete
  }

  override activate(): void {
    // ToolManager will route pointer events
  }

  override deactivate(): void {
    this.cleanup()
  }

  override handleMouseDown(point: Point, event: PointerEvent): void {
    if (event.button !== 0) return
    const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, Tool.imageBounds)
    if (!this.isCurrentlyDrawing) {
      this.startDrawing(clamped)
    } else {
      this.addPoint(clamped)
    }
  }

  override handleMouseMove(point: Point, _event: PointerEvent): void {
    if (!this.isCurrentlyDrawing || !this.currentShape) return
    const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, Tool.imageBounds)
    const previewPoints =
      this.points.length === 1 ? [this.points[0], clamped] : [this.points[0], this.points[1]]
    const geometry: Geometry = { type: 'line', points: previewPoints as [Point, Point] }
    this.currentShape.update(geometry)
  }

  override handleMouseUp(_point: Point, event: PointerEvent): void {
    if (event.button !== 0) return
    // Double-click to complete immediately
    if (this.doubleClickTimeout !== null) {
      clearTimeout(this.doubleClickTimeout)
      this.doubleClickTimeout = null
      this.completeShape()
      return
    }
    this.doubleClickTimeout = window.setTimeout(() => {
      this.doubleClickTimeout = null
      // For a line, two clicks suffice; completion handled in addPoint when points === 2
    }, 300)
  }

  override handleDoubleClick(_point: Point, _event: PointerEvent): void {
    this.completeShape()
  }


  isDrawing(): boolean {
    return this.isCurrentlyDrawing
  }

  private startDrawing(point: Point): void {
    this.isCurrentlyDrawing = true
    this.points = [point]
    const geometry: Geometry = { type: 'line', points: [point, point] }
    this.currentShape = new LineShape(uuid(), geometry)
    const element = this.currentShape.getElement()
    if (element) {
      if (this.svg.contains(element)) element.remove()
      this.svg.appendChild(element)
    }
  }

  private addPoint(point: Point): void {
    if (this.points.length === 1) {
      if (!this.isNearPoint(point, this.points[0])) {
        this.points.push(point)
        if (this.currentShape) {
          const geometry: Geometry = { type: 'line', points: [this.points[0], this.points[1]] }
          this.currentShape.update(geometry)
        }
        // Immediately complete once the second point is placed
        this.completeShape()
      }
    }
  }

  private completeShape(): void {
    if (!this.isCurrentlyDrawing || !this.currentShape) return
    if (this.points.length < this.minPoints) {
      this.cleanup()
      return
    }
    // Remove duplicates
    this.points = Array.from(new Map(this.points.map(p => [`${p.x},${p.y}`, p])).values())
    // Ensure exactly two points
    if (this.points.length > 2) this.points = [this.points[0], this.points[this.points.length - 1]]
    // Clamp
    this.points = this.points.map(p =>
      (this.constructor as typeof Tool).clampToImageBounds(p, Tool.imageBounds)
    )
    const geometry: Geometry = { type: 'line', points: [this.points[0], this.points[1]] }
    this.currentShape.update(geometry)

    // Move element to end to keep proper z-index
    const finalShape = this.currentShape.getElement()
    this.svg.appendChild(finalShape)
    this.onComplete(this.currentShape)
    this.cleanup()
  }

  private isNearPoint(p1: Point, p2: Point): boolean {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy) < this.snapDistance
  }

  private cleanup(): void {
    if (this.currentShape) {
      const el = this.currentShape.getElement()
      if (el && el.parentNode) el.parentNode.removeChild(el)
      this.currentShape.destroy()
      this.currentShape = null
    }
    this.points = []
    this.isCurrentlyDrawing = false
    if (this.doubleClickTimeout !== null) {
      clearTimeout(this.doubleClickTimeout)
      this.doubleClickTimeout = null
    }
  }
}
