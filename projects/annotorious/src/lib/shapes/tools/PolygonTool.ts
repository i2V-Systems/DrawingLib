import { Tool } from '../../core/tools/Tool';
import { EventEmitter } from '../../core/events/EventEmitter';
import { Point } from '../types';
import { ShapeFactory } from '../base/ShapeFactory';
import { PolygonShape } from '../PolygonShape';

export class PolygonTool extends EventEmitter implements Tool {
  capabilities = {
    supportsMouse: true,
    supportsKeyboard: true
  };
  name = 'polygon';
  
  private svg: SVGSVGElement;
  private currentShape: PolygonShape | null = null;
  private points: Point[] = [];
  private isDrawing = false;
  private onComplete: (shape: PolygonShape) => void;
  private minPoints = 3;
  private snapDistance = 20;
  private doubleClickTimeout: number | null = null;

  constructor(svg: SVGSVGElement, onComplete: (shape: PolygonShape) => void) {
    super();
    this.svg = svg;
    this.onComplete = onComplete;
  }

  handleMouseDown = (event: MouseEvent): void => {
    const point = this.getMousePosition(event);
    if (event.button === 0) { // Left click only
      if (!this.isDrawing) {
        this.startDrawing(point);
      } else {
        this.addPoint(point);
      }
    } else if (event.button === 2) { // Right click
      this.completeShape();
    }
  }

  handleMouseMove = (event: MouseEvent): void => {
    const point = this.getMousePosition(event);
    if (this.isDrawing && this.currentShape) {
      // Update the last point (preview line)
      const points = [...this.points, point];
      this.currentShape.update({ type: 'polygon', points });

      // Check if near starting point to close polygon
      if (this.points.length >= this.minPoints) {
        const startPoint = this.points[0];
        if (this.isNearPoint(point, startPoint)) {
          this.currentShape.update({ type: 'polygon', points: [...this.points, this.points[0]] });
        }
      }
    }
  }

  handleMouseUp = (event: MouseEvent): void => {
    const point = this.getMousePosition(event);
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

  handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.cleanup();
    } else if (event.key === 'Enter') {
      this.completeShape();
    }
  }

  activate(): void {
    // Attach event listeners when tool is activated

  }

  deactivate(): void {
    // Cleanup any remaining drawing state
    this.cleanup();
  }

  private getMousePosition(event: MouseEvent): Point {
    const rect = this.svg.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private startDrawing(point: Point): void {
    this.isDrawing = true;
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
    if (this.isDrawing && this.currentShape && this.points.length >= this.minPoints) {
      // Update the shape with final points
      const points = [...this.points];
      if (!this.isNearPoint(points[points.length - 1], points[0])) {
        // Close the polygon if not already closed
        points.push(points[0]);
      }
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
    this.isDrawing = false;
    
    // Clear double click timeout
    if (this.doubleClickTimeout !== null) {
      clearTimeout(this.doubleClickTimeout);
      this.doubleClickTimeout = null;
    }
  }
}
