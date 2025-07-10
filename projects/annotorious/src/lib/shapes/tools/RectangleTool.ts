import { Tool } from '../../core/tools/Tool';
import { EventEmitter } from '../../core/events/EventEmitter';
import { Point } from '../types';
import { ShapeFactory } from '../base/ShapeFactory';
import { RectangleShape } from '../RectangleShape';

export class RectangleTool extends EventEmitter implements Tool {
  name = 'rectangle';
  
  private svg: SVGSVGElement;
  private currentShape: RectangleShape | null = null;
  private startPoint: Point | null = null;
  private onComplete: (shape: RectangleShape) => void;

  constructor(svg: SVGSVGElement, onComplete: (shape: RectangleShape) => void) {
    super();
    this.svg = svg;
    this.onComplete = onComplete;
  }

  activate(): void {
    // Optional setup when tool is activated
  }

  deactivate(): void {
    this.cleanup();
  }

  handleMouseDown(point: Point, _event: MouseEvent): void {
    if (_event.button === 0) { // Left click only
      this.startPoint = point;
      
      // Create initial shape
      this.currentShape = ShapeFactory.createDefault(
        crypto.randomUUID(),
        'rectangle'
      ) as RectangleShape;
      
      // Add to SVG
      this.svg.appendChild(this.currentShape.getElement());
    }
  }

  handleMouseMove(point: Point): void {
    if (this.startPoint && this.currentShape) {
      // Calculate rectangle dimensions
      const x = Math.min(this.startPoint.x, point.x);
      const y = Math.min(this.startPoint.y, point.y);
      const width = Math.abs(point.x - this.startPoint.x);
      const height = Math.abs(point.y - this.startPoint.y);
      
      // Update shape
      this.currentShape.update({ type: 'rectangle', x, y, width, height });
    }
  }

  handleMouseUp(point: Point): void {
    if (this.startPoint && this.currentShape) {
      // Only complete if the rectangle has some size
      if (Math.abs(point.x - this.startPoint.x) > 2 && 
          Math.abs(point.y - this.startPoint.y) > 2) {
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
