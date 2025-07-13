import { Tool } from '../../core/tools/Tool';
import { EventEmitter } from '../../core/events/EventEmitter';
import { Point } from '../../types/shape.types';
import { ShapeFactory } from '../base/ShapeFactory';
import { EllipseShape } from '../EllipseShape';

export class EllipseTool extends EventEmitter implements Tool {
  name = 'ellipse';
  capabilities = {
    supportsMouse: true
  };
  
  private svg: SVGSVGElement;
  private currentShape: EllipseShape | null = null;
  private startPoint: Point | null = null;
  private isRotating = false;
  private onComplete: (shape: EllipseShape) => void;
  private minSize = 4;

  constructor(svg: SVGSVGElement, onComplete: (shape: EllipseShape) => void) {
    super();
    this.svg = svg;
    this.onComplete = onComplete;
  }

  activate(): void {
    // Tool is now activated - no need to add event listeners
    // The ToolManager will handle all events and delegate to this tool
  }

  deactivate(): void {
    this.cleanup();
  }

  handleMouseDown(point: Point, event: MouseEvent): void {
    if (event.button === 0) { // Left click only
      if (!this.currentShape) {
        this.startDrawing(point);
      } else if (event.shiftKey) {
        this.isRotating = true;
      }
    }
  }

  handleMouseMove(point: Point, _event: MouseEvent): void {
    if (this.startPoint && this.currentShape) {
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
        const radiusX = Math.abs(point.x - this.startPoint.x) / 2;
        const radiusY = Math.abs(point.y - this.startPoint.y) / 2;
        const center = {
          x: this.startPoint.x + (point.x - this.startPoint.x) / 2,
          y: this.startPoint.y + (point.y - this.startPoint.y) / 2
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

  handleMouseUp(point: Point, _event: MouseEvent): void {
    if (this.startPoint && this.currentShape) {
      if (this.isRotating) {
        this.isRotating = false;
      } else {
        const radiusX = Math.abs(point.x - this.startPoint.x) / 2;
        const radiusY = Math.abs(point.y - this.startPoint.y) / 2;
        
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
