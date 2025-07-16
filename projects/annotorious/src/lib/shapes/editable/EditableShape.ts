// Define EditHandle locally if not imported
type EditHandle = {
  position: import('../../types/shape.types').Point;
  element: SVGElement;
  onDrag: (newPos: import('../../types/shape.types').Point) => void;
};
import { Shape } from '../../shapes/base';
import { Point } from '../../types/shape.types';

export abstract class EditableShape {
  protected handles: EditHandle[] = [];
  protected shape: Shape;

  constructor(shape: Shape) {
    this.shape = shape;
  }

  // Remove all handles from DOM
  destroy(): void {
    this.handles.forEach(handle => {
      if (handle.element.parentNode) {
        handle.element.parentNode.removeChild(handle.element);
      }
    });
    this.handles = [];
  }

  // Move the shape by delta (can be overridden if needed)
  moveBy(deltaX: number, deltaY: number): void {
    this.shape.moveBy(deltaX, deltaY);
    this.updateHandlePositions();
  }

  // Get geometry
  getGeometry(): any {
    return this.shape.getGeometry();
  }

  // Abstract: Each shape must implement these
  abstract createHandles(): EditHandle[];
  abstract updateFromHandle(handle: EditHandle, newPosition: Point): void;
  abstract updateHandlePositions(): void;

  // Public getter for handles
  public getHandles(): EditHandle[] {
    return this.handles;
  }

  // Utility for creating a handle (EditHandle)
  protected createHandle(x: number, y: number, onDrag: (newPos: Point) => void): EditHandle {
    return {
      position: { x, y },
      element: this.createSVGHandle(x, y),
      onDrag,
    };
  }

  // Utility for creating a circle SVG handle
  protected createSVGHandle(x: number, y: number, r: number = 6, className: string = 'a9s-handle'): SVGCircleElement {
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle.setAttribute('cx', x.toString());
    handle.setAttribute('cy', y.toString());
    handle.setAttribute('r', r.toString());
    handle.setAttribute('class', className);
    return handle;
  }
} 