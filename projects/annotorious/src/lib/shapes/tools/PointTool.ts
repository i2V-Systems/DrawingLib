import { Tool } from '../../core/tools/Tool';
import { EventEmitter } from '../../core/events/EventEmitter';
import { Point } from '../../types/shape.types';
import { ShapeFactory } from '../base/ShapeFactory';
import { PointShape } from '../PointShape';

export class PointTool extends EventEmitter implements Tool {
  name = 'point';
  capabilities = {
    supportsMouse: true
  };
  
  private svg: SVGSVGElement;
  private onComplete: (shape: PointShape) => void;

  constructor(svg: SVGSVGElement, onComplete: (shape: PointShape) => void) {
    super();
    this.svg = svg;
    this.onComplete = onComplete;
  }

  activate(): void {
    // Tool is now activated - no need to add event listeners
    // The ToolManager will handle all events and delegate to this tool
  }

  deactivate(): void {
    // No cleanup needed for point tool
  }

  handleMouseDown(point: Point, event: MouseEvent): void {
    if (event.button === 0) { // Left click only
      // Create point shape immediately on click
      const pointShape = ShapeFactory.createDefault(
        crypto.randomUUID(),
        'point'
      ) as PointShape;
      
      // Update shape with click position
      pointShape.update({ type: 'point', x: point.x, y: point.y });
      
      // Add to SVG
      this.svg.appendChild(pointShape.getElement());
      
      // Complete immediately
      this.onComplete(pointShape);
    }
  }

  handleMouseMove(point: Point, _event: MouseEvent): void {
    // No preview needed for point tool
  }

  handleMouseUp(point: Point, _event: MouseEvent): void {
    // Point is created on mouse down, so nothing to do here
  }






} 