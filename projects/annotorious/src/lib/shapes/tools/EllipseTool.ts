import { Tool } from '../../core/tools/Tool';
import { Point } from '../../types/shape.types';
import { ShapeFactory } from '../base/ShapeFactory';
import { EllipseShape } from '../EllipseShape';

export class EllipseTool extends Tool {
  override name = 'ellipse';
  override capabilities = {
    supportsMouse: true
  };
  
  private svg: SVGSVGElement;
  private currentShape: EllipseShape | null = null;
  private startPoint: Point | null = null;
  private isRotating = false;
  private onComplete: (shape: EllipseShape) => void;
  private minSize = 4;
  private imageBounds: { naturalWidth: number, naturalHeight: number };

  constructor(svg: SVGSVGElement, onComplete: (shape: EllipseShape) => void, imageBounds: { naturalWidth: number, naturalHeight: number }) {
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

  override handleMouseDown(point: Point, event: MouseEvent): void {
    if (event.button === 0) { // Left click only
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      if (!this.currentShape) {
        this.startDrawing(clamped);
      } else if (event.shiftKey) {
        this.isRotating = true;
      }
    }
  }

  override handleMouseMove(point: Point, _event: MouseEvent): void {
    if (this.startPoint && this.currentShape) {
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      if (this.isRotating) {
        // Rotation is not supported yet
        
        this.currentShape.update({ 
          type: 'ellipse',
          cx: this.startPoint.x,
          cy: this.startPoint.y,
          rx: 0,
          ry: 0
        });
      } else {
        // Calculate ellipse dimensions
        const radiusX = Math.abs(clamped.x - this.startPoint.x) / 2;
        const radiusY = Math.abs(clamped.y - this.startPoint.y) / 2;
        const center = {
          x: this.startPoint.x + (clamped.x - this.startPoint.x) / 2,
          y: this.startPoint.y + (clamped.y - this.startPoint.y) / 2
        };
        
        this.currentShape.update({ 
          type: 'ellipse',
          cx: center.x,
          cy: center.y,
          rx: radiusX,
          ry: radiusY
        });
      }
    }
  }

  override handleMouseUp(point: Point, _event: MouseEvent): void {
    if (this.startPoint && this.currentShape) {
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      if (this.isRotating) {
        this.isRotating = false;
      } else {
        const radiusX = Math.abs(clamped.x - this.startPoint.x) / 2;
        const radiusY = Math.abs(clamped.y - this.startPoint.y) / 2;
        
        // Only complete if the ellipse has some size
        if (radiusX > this.minSize && radiusY > this.minSize) {
          this.onComplete(this.currentShape);
        } else {
          this.cleanup();
        }
        
        this.startPoint = null;
        this.currentShape = null;
      }
    }
  }

  private startDrawing(point: Point): void {
    this.startPoint = point;
    
    // Create initial shape
    this.currentShape = ShapeFactory.createDefault(
      crypto.randomUUID(),
      'ellipse'
    ) as EllipseShape;
    
    // Add to SVG
    this.svg.appendChild(this.currentShape.getElement());
  }

  private cleanup(): void {
    if (this.currentShape) {
      this.currentShape.destroy();
      this.currentShape = null;
    }
    this.startPoint = null;
    this.isRotating = false;
  }

}
