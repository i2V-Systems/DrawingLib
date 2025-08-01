import { Tool } from './base/Tool';
import { Point } from '../types/shape.types';
import { ShapeFactory } from '../shapes/base/ShapeFactory';
import { PolygonShape } from '../shapes/PolygonShape';

export class FreehandTool extends Tool {
  override name = 'freehand';
  override capabilities = {
    supportsMouse: true
  };
  
  private svg: SVGSVGElement;
  private currentShape: PolygonShape | null = null;
  private isCurrentlyDrawing: boolean = false;
  private points: Point[] = [];
  private onComplete: (shape: PolygonShape) => void;
  private pathElement: SVGPathElement | null = null;

  constructor(svg: SVGSVGElement, onComplete: (shape: PolygonShape) => void, imageBounds: { naturalWidth: number, naturalHeight: number }) {
    super(imageBounds);
    this.svg = svg;
    this.onComplete = onComplete;

  }

  override activate(): void {
    this.svg.style.cursor = 'crosshair';
    // Tool is now activated - no need to add event listeners
    // The ToolManager will handle all events and delegate to this tool
  }

  override deactivate(): void {
    this.svg.style.cursor = '';
    this.cleanup();
  }

  override handleMouseDown(point: Point, event: PointerEvent): void {
    if (event.button === 0) { // Left click only
      this.isCurrentlyDrawing = true;
      this.points = [(this.constructor as typeof Tool).clampToImageBounds(point, Tool.imageBounds)];
      
      // Create path element for visual feedback
      this.pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.pathElement.setAttribute('stroke', '#000');
      this.pathElement.setAttribute('stroke-width', '2');
      this.pathElement.setAttribute('fill', 'none');
      this.pathElement.setAttribute('class', 'freehand-path');
      this.svg.appendChild(this.pathElement);
      
      this.updatePath();
    }
  }

  override handleMouseMove(point: Point, _event: PointerEvent): void {
    if (this.isCurrentlyDrawing && this.pathElement) {
      // Add point if it's far enough from the last point
      const lastPoint = this.points[this.points.length - 1];
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, Tool.imageBounds);
      const distance = Math.sqrt((clamped.x - lastPoint.x) ** 2 + (clamped.y - lastPoint.y) ** 2);
      
      if (distance > 2) { // Minimum distance threshold
        this.points.push(clamped);
        this.updatePath();
      }
    }
  }

  override handleMouseUp(point: Point, _event: PointerEvent): void {
    if (this.isCurrentlyDrawing) {
      this.isCurrentlyDrawing = false;
      
      // Only complete if we have enough points
      if (this.points.length >= 3) {
        // Create polygon shape from points
        this.currentShape = ShapeFactory.createDefault(
          crypto.randomUUID(),
          'polygon'
        ) as PolygonShape;
        
        // Update with actual points
        this.currentShape.update({ type: 'polygon', points: this.points });
        
        // Add to SVG
        this.svg.appendChild(this.currentShape.getElement());
        
        this.onComplete(this.currentShape);
      }
      
      this.cleanup();
    }
  }


  private updatePath(): void {
    if (this.pathElement && this.points.length > 0) {
      const pathData = this.points.map((point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${command} ${point.x} ${point.y}`;
      }).join(' ');
      
      this.pathElement.setAttribute('d', pathData);
    }
  }

  private cleanup(): void {
    if (this.pathElement && this.pathElement.parentNode) {
      this.pathElement.parentNode.removeChild(this.pathElement);
      this.pathElement = null;
    }
    this.points = [];
    this.currentShape = null;
  }

} 