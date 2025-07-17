import { Tool } from './base/Tool';
import { Point } from '../types/shape.types';
import { ShapeFactory } from '../shapes/base/ShapeFactory';
import { RectangleShape } from '../shapes/RectangleShape';

export class RectangleTool extends Tool {
  override name = 'rectangle';
  override capabilities = {
    supportsMouse: true
  };
  
  private svg: SVGSVGElement;
  private currentShape: RectangleShape | null = null;
  private startPoint: Point | null = null;
  private onComplete: (shape: RectangleShape) => void;
  private imageBounds: { naturalWidth: number, naturalHeight: number };

  constructor(svg: SVGSVGElement, onComplete: (shape: RectangleShape) => void, imageBounds: { naturalWidth: number, naturalHeight: number }) {
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

  override handleMouseDown(point: Point, _event: PointerEvent): void {
    if (_event.button === 0) { // Left click only
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      this.startPoint = clamped;
      
      // Create initial shape
      this.currentShape = ShapeFactory.createDefault(
        crypto.randomUUID(),
        'rectangle'
      ) as RectangleShape;
      
      // Add to SVG
      this.svg.appendChild(this.currentShape.getElement());
    }
  }

  override handleMouseMove(point: Point): void {
    if (this.startPoint && this.currentShape) {
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      // Calculate rectangle dimensions
      const x = Math.min(this.startPoint.x, clamped.x);
      const y = Math.min(this.startPoint.y, clamped.y);
      const width = Math.abs(clamped.x - this.startPoint.x);
      const height = Math.abs(clamped.y - this.startPoint.y);
      
      // Update shape
      this.currentShape.update({ type: 'rectangle', x, y, width, height });
    }
  }

  override handleMouseUp(point: Point): void {
    if (this.startPoint && this.currentShape) {
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      // Only complete if the rectangle has some size
      if (Math.abs(clamped.x - this.startPoint.x) > 2 && 
          Math.abs(clamped.y - this.startPoint.y) > 2) {
        this.onComplete(this.currentShape);
      } else {
        this.cleanup();
      }
      
      this.startPoint = null;
      this.currentShape = null;
    }
  }

  private cleanup(): void {
    if (this.currentShape) {
      this.currentShape.destroy();
      this.currentShape = null;
    }
    this.startPoint = null;
  }

}
