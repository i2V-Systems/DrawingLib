import { PolylineArrowShape } from "../shapes/ArrowPolylineShape";
import { Point, PolylineArrowGeometry } from "../types";
import { Tool } from "./base";

export class PolylineArrowTool extends Tool {
  override capabilities = { supportsMouse: true };
  override name = 'polyline-arrow';

  private svg: SVGSVGElement;
  private currentShape: PolylineArrowShape | null = null;
  private points: Point[] = [];
  private isCurrentlyDrawing = false;
  private onComplete: (shape: PolylineArrowShape) => void;
  private minPoints = 2; // Polylines need minimum 2 points
  private imageBounds: { naturalWidth: number, naturalHeight: number };

  constructor(
    svg: SVGSVGElement, 
    onComplete: (shape: PolylineArrowShape) => void, 
    imageBounds: { naturalWidth: number, naturalHeight: number }
  ) {
    super();
    this.svg = svg;
    this.onComplete = onComplete;
    this.imageBounds = imageBounds;
  }

  override activate(): void {
    // Tool activated - ToolManager handles events
  }

  override deactivate(): void {
    this.cleanup();
  }

  override handleMouseDown(point: Point, event: PointerEvent): void {
    if (event.button === 0) {
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      if (!this.isCurrentlyDrawing) {
        this.startDrawing(clamped);
      } else {
        this.addPoint(clamped);
      }
    }
  }

  override handleMouseMove(point: Point, _event: PointerEvent): void {
    if (this.isCurrentlyDrawing && this.currentShape) {
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      const points = [...this.points, clamped];
      
      // Create default arrows for preview (one for each segment)
      const arrows = points.length > 1 ? 
        points.slice(0, -1).map((_, i) => ({
          startIndex: i,
          endIndex: i + 1,
          direction: 'up' as const
        })) : [];
      
      this.currentShape.update({ type: 'polyline-arrow', points, arrows });
    }
  }

  override handleMouseUp(point: Point, event: PointerEvent): void {
    // Double-click or right-click to finish
    if (event.button === 2 || event.detail === 2) { // Right click or double click
      this.completeShape();
    }
  }

  override handleDoubleClick(point: Point, event: PointerEvent): void {
    this.completeShape();
  }

  isDrawing(): boolean {
    return this.isCurrentlyDrawing;
  }

  private startDrawing(point: Point): void {
    this.isCurrentlyDrawing = true;
    this.points = [point];
    
    // Create initial polyline arrow shape
    const geometry: PolylineArrowGeometry = {
      type: 'polyline-arrow',
      points: [point],
      arrows: []
    };
    
    this.currentShape = new PolylineArrowShape(crypto.randomUUID(), geometry);
    
    const element = this.currentShape.getElement();
    if (element && this.svg.contains(element)) {
      element.remove();
    }
    this.svg.appendChild(element);
  }

  private addPoint(point: Point): void {
    this.points.push(point);
    if (this.currentShape) {
      // Create arrows for all segments
      const arrows = this.points.length > 1 ? 
        this.points.slice(0, -1).map((_, i) => ({
          startIndex: i,
          endIndex: i + 1,
          direction: 'up' as const
        })) : [];
      
      this.currentShape.update({ type: 'polyline-arrow', points: this.points, arrows });
    }
  }

  private completeShape(): void {
    if (this.isCurrentlyDrawing && this.currentShape && this.points.length >= this.minPoints) {
      // Remove duplicate points
      this.points = Array.from(
        new Map(this.points.map(p => [`${p.x},${p.y}`, p])).values()
      );
      
      // Clamp all points to image bounds
      this.points = this.points.map(p => 
        (this.constructor as typeof Tool).clampToImageBounds(p, this.imageBounds)
      );
      
      // Create default arrows for all segments
      const arrows = this.points.length > 1 ? 
        this.points.slice(0, -1).map((_, i) => ({
          startIndex: i,
          endIndex: i + 1,
          direction: 'up' as const
        })) : [];
      
      this.currentShape.update({ type: 'polyline-arrow', points: this.points, arrows });
      
      const finalShape = this.currentShape.getElement();
      this.svg.appendChild(finalShape);
      
      this.onComplete(this.currentShape);
      this.cleanup();
    }
  }

  private cleanup(): void {
    if (this.currentShape) {
      const element = this.currentShape.getElement();
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.currentShape.destroy();
      this.currentShape = null;
    }

    this.points = [];
    this.isCurrentlyDrawing = false;
  }
}
