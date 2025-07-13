import { Tool } from '../../core/tools/Tool';
import { EventEmitter } from '../../core/events/EventEmitter';
import { Point } from '../../types/shape.types';
import { ShapeFactory } from '../base/ShapeFactory';
import { CircleShape } from '../CircleShape';

export class CircleTool extends EventEmitter implements Tool {
  name = 'circle';
  capabilities = {
    supportsMouse: true
  };
  
  private svg: SVGSVGElement;
  private currentShape: CircleShape | null = null;
  private center: Point | null = null;
  private onComplete: (shape: CircleShape) => void;
  private minRadius = 2;

  constructor(svg: SVGSVGElement, onComplete: (shape: CircleShape) => void) {
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
      this.center = point;
      
      // Create initial shape
      this.currentShape = ShapeFactory.createDefault(
        crypto.randomUUID(),
        'circle'
      ) as CircleShape;
      
      // Add to SVG
      this.svg.appendChild(this.currentShape.getElement());
    }
  }

  handleMouseMove(point: Point, _event: MouseEvent): void {
    if (this.center && this.currentShape) {
      // Calculate radius
      const radius = this.calculateRadius(this.center, point);
      
      // Update shape
      this.currentShape.update({
        type: 'circle',
        cx: this.center.x,
        cy: this.center.y,
        r: radius
      });
    }
  }

  handleMouseUp(point: Point, _event: MouseEvent): void {
    if (this.center && this.currentShape) {
      const radius = this.calculateRadius(this.center, point);
      
      // Only complete if the circle has some size
      if (radius > this.minRadius) {
        this.onComplete(this.currentShape);
      } else {
        this.cleanup();
      }
      
      this.center = null;
      this.currentShape = null;
    }
  }



  private calculateRadius(center: Point, point: Point): number {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private cleanup(): void {
    if (this.currentShape) {
      this.currentShape.destroy();
      this.currentShape = null;
    }
    this.center = null;
  }




}
