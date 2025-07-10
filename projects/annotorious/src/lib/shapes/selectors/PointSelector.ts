import { Point, PointGeometry } from '../types';
import { PointShape } from '../PointShape';
import { Tool } from '../../core/tools/Tool';
import { EventEmitter } from '../../core/events/EventEmitter';

export class PointSelector extends EventEmitter implements Tool {
  name = 'point';

  private enabled: boolean = true;
  private container: SVGGElement;
  private currentShape: PointShape | null = null;

  constructor(container: SVGGElement) {
    super();
    this.container = container;
  }

  activate(): void {
    // Point selector is always ready
  }

  deactivate(): void {
    // Clean up any in-progress point if needed
    if (this.currentShape) {
      this.currentShape.destroy();
      this.currentShape = null;
    }
  }

  handleMouseDown(point: Point, _event: MouseEvent): void {
    if (!this.enabled) return;

    // Create point geometry
    const geometry: PointGeometry = {
      type: 'point',
      x: point.x,
      y: point.y
    } as PointGeometry;

    // Create shape
    this.currentShape = new PointShape(geometry);
    this.container.appendChild(this.currentShape.getElement());

    // Emit create event
    this.emit('create', { 
      geometry, 
      element: this.currentShape.getElement() 
    });

    // Clear current shape
    this.currentShape = null;
  }

  handleMouseMove(_point: Point, _event: MouseEvent): void {
    // Point selector doesn't need mouse move handling
  }

  handleMouseUp(_point: Point, _event: MouseEvent): void {
    // Point selector doesn't need mouse up handling
  }

  handleKeyDown(_event: KeyboardEvent): void {
    // Point selector doesn't need keyboard handling
  }

  handleKeyUp(_event: KeyboardEvent): void {
    // Point selector doesn't need keyboard handling
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  destroy(): void {
    if (this.currentShape) {
      this.currentShape.destroy();
    }
  }
}
