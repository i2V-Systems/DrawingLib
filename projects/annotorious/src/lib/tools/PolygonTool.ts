import { Tool } from './base/Tool';
import { Point } from '../types/shape.types';
import { ShapeFactory } from '../shapes/base/ShapeFactory';
import { PolygonShape } from '../shapes/PolygonShape';

export class PolygonTool extends Tool {
  override capabilities = {
    supportsMouse: true
  };
  override name = 'polygon';
  
  private svg: SVGSVGElement;
  private currentShape: PolygonShape | null = null;
  private points: Point[] = [];
  private isCurrentlyDrawing = false;
  private onComplete: (shape: PolygonShape) => void;
  private minPoints = 3;
  private snapDistance = 20;
  private doubleClickTimeout: number | null = null;
  private imageBounds: { naturalWidth: number, naturalHeight: number };

  constructor(svg: SVGSVGElement, onComplete: (shape: PolygonShape) => void, imageBounds: { naturalWidth: number, naturalHeight: number }) {
    super();
    this.svg = svg;
    this.onComplete = onComplete;
    this.imageBounds = imageBounds;
  }

  override activate(): void {
    // Tool is now activated - no need to add event listeners
    // The ToolManager will handle all events and delegate to this tool
  }

  override deactivate(): void {
    // Cleanup any remaining drawing state
    this.cleanup();
  }

  override handleMouseDown(point: Point, event: PointerEvent): void {
    if (event.button === 0) { // Left click only
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
      // Update the last point (preview line)
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      const points = [...this.points, clamped];
      this.currentShape.update({ type: 'polygon', points });

      // Check if near starting point to close polygon
      if (this.points.length >= this.minPoints) {
        const startPoint = this.points[0];
        if (this.isNearPoint(clamped, startPoint)) {
          this.currentShape.update({ type: 'polygon', points: [...this.points, this.points[0]] });
        }
      }
    }
  }

  override handleMouseUp(point: Point, event: PointerEvent): void {
    if (event.button === 0) { // Left click only
      // Check for double click
      if (this.doubleClickTimeout !== null) {
        clearTimeout(this.doubleClickTimeout);
        this.doubleClickTimeout = null;
        this.completeShape();
      } else {
        this.doubleClickTimeout = window.setTimeout(() => {
          this.doubleClickTimeout = null;
        }, 300);
      }
    }
  }

  isDrawing(): boolean {
    return this.isCurrentlyDrawing;
  }

  private startDrawing(point: Point): void {
    this.isCurrentlyDrawing = true;
    this.points = [point];
    
    // Create initial shape
    this.currentShape = ShapeFactory.createDefault(
      crypto.randomUUID(),
      'polygon'
    ) as PolygonShape;
    
    // Add to SVG
    const element = this.currentShape.getElement();
    if (element && this.svg.contains(element)) {
      element.remove();
    }
    this.svg.appendChild(element);
  }

  private addPoint(point: Point): void {
    if (this.points.length >= this.minPoints) {
      // Check if clicking near start point to close polygon
      const startPoint = this.points[0];
      if (this.isNearPoint(point, startPoint)) {
        this.completeShape();
        return;
      }
    }

    this.points.push(point);
    if (this.currentShape) {
      this.currentShape.update({ type: 'polygon', points: this.points });
    }
  }

  private completeShape(): void {
    if (this.isCurrentlyDrawing && this.currentShape && this.points.length >= this.minPoints) {
      // Update the shape with final points
      this.points = Array.from(
        new Map(this.points.map(p => [`${p.x},${p.y}`, p])).values()
      );
      // Clamp all points to image bounds before finalizing
      this.points = this.points.map(p => (this.constructor as typeof Tool).clampToImageBounds(p, this.imageBounds));
      const points = [...this.points];
      this.currentShape.update({ type: 'polygon', points });

      // Get the final shape element
      const finalShape = this.currentShape.getElement();
      
      // Move the shape to the end of the SVG (to ensure proper z-index)
      this.svg.appendChild(finalShape);

      // Call onComplete with the shape
      this.onComplete(this.currentShape);

      // Cleanup the drawing state
      this.cleanup();
    }
  }

  private isNearPoint(p1: Point, p2: Point): boolean {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy) < this.snapDistance;
  }

  private cleanup(): void {
    if (this.currentShape) {
      // Remove the temporary drawing shape
      const element = this.currentShape.getElement();
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
      
      // Clean up any event listeners on the shape
      this.currentShape.destroy();
      this.currentShape = null;
    }
    
    this.points = [];
    this.isCurrentlyDrawing = false;
    
    // Clear double click timeout
    if (this.doubleClickTimeout !== null) {
      clearTimeout(this.doubleClickTimeout);
      this.doubleClickTimeout = null;
    }
  }

}
