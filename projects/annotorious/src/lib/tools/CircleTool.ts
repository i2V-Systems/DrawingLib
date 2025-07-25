import { Tool } from './base/Tool';
import { Point } from '../types/shape.types';
import { ShapeFactory } from '../shapes/base/ShapeFactory';
import { CircleShape } from '../shapes/CircleShape';

export class CircleTool extends Tool {
  override name = 'circle';
  override capabilities = {
    supportsMouse: true
  };
  
  private svg: SVGSVGElement;
  private currentShape: CircleShape | null = null;
  private startPoint: Point | null = null;
  private onComplete: (shape: CircleShape) => void;
  private minRadius = 2;
  private imageBounds: { naturalWidth: number, naturalHeight: number };

  constructor(svg: SVGSVGElement, onComplete: (shape: CircleShape) => void, imageBounds: { naturalWidth: number, naturalHeight: number }) {
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
    this.cleanup();
  }

  override handleMouseDown(point: Point, event: PointerEvent): void {
    if (event.button === 0) { // Left click only
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      if (!this.currentShape) {
        this.startDrawing(clamped);
      }
    }
  }

  override handleMouseMove(point: Point, _event: PointerEvent): void {
    if (this.startPoint && this.currentShape) {
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      const radius = this.calculateRadius(this.startPoint, clamped) / 2;
      const center = {
        x: this.startPoint.x + (clamped.x - this.startPoint.x) / 2,
        y: this.startPoint.y + (clamped.y - this.startPoint.y) / 2
      };
      
      this.currentShape.update({
        type: 'circle',
        cx: center.x,
        cy: center.y,
        r: radius
      });
    }
  }

  override handleMouseUp(point: Point, _event: PointerEvent): void {
    if (this.startPoint && this.currentShape) {
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      const radius = this.calculateRadius(this.startPoint, clamped) / 2;
      
      // Only complete if the circle has some size
      if (radius > this.minRadius) {
        this.onComplete(this.currentShape);
      } else {
        this.cleanup();
      }
      
      this.startPoint = null;
      this.currentShape = null;
    }
  }

  private startDrawing(point: Point): void {
    this.startPoint = point;
    
    // Create initial shape
    this.currentShape = ShapeFactory.createDefault(
      crypto.randomUUID(),
      'circle'
    ) as CircleShape;
    
    // Add to SVG
    this.svg.appendChild(this.currentShape.getElement());
  }

  private calculateRadius(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private cleanup(): void {
    if (this.currentShape) {
      this.currentShape.destroy();
      this.currentShape = null;
    }
    this.startPoint = null;
  }

}
