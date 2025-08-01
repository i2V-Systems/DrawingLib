import { Tool } from './base/Tool';
import { Point } from '../types/shape.types';
import { ShapeFactory } from '../shapes/base/ShapeFactory';
import { PointShape } from '../shapes/PointShape';

export class PointTool extends Tool {
  override name = 'point';
  override capabilities = {
    supportsMouse: true
  };
  
  private svg: SVGSVGElement;
  private onComplete: (shape: PointShape) => void;

  constructor(svg: SVGSVGElement, onComplete: (shape: PointShape) => void, imageBounds: { naturalWidth: number, naturalHeight: number }) {
    super(imageBounds);
    this.svg = svg;
    this.onComplete = onComplete;
  }

  override activate(): void {
    // Tool is now activated - no need to add event listeners
    // The ToolManager will handle all events and delegate to this tool
  }

  override deactivate(): void {
    // No cleanup needed for point tool
  }

  override handleMouseDown(point: Point, event: PointerEvent): void {
    if (event.button === 0) { // Left click only
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, Tool.imageBounds);
      // Create point shape immediately on click
      const pointShape = ShapeFactory.createDefault(
        crypto.randomUUID(),
        'point'
      ) as PointShape;
      
      // Update shape with click position
      pointShape.update({ type: 'point', x: clamped.x, y: clamped.y });
      
      // Add to SVG
      this.svg.appendChild(pointShape.getElement());
      
      // Complete immediately
      this.onComplete(pointShape);
    }
  }

  override handleMouseMove(point: Point, _event: PointerEvent): void {
    // No preview needed for point tool
  }

  override handleMouseUp(point: Point, _event: PointerEvent): void {
    // Point is created on mouse down, so nothing to do here
  }

} 