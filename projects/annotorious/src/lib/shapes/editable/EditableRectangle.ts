import { EditableShape } from './EditableShape';
import { Point } from '../../types/shape.types';
import { Shape } from '../base/Shape';

// Temporary EditHandle type if not available
type EditHandle = {
  position: Point;
  element: SVGElement;
  onDrag: (newPos: Point) => void;
};

type RectangleGeometry = {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
};

export class EditableRectangle extends EditableShape {
  constructor(shape: Shape) {
    super(shape);
    this.handles = this.createHandles();
  }

  createHandles(): EditHandle[] {
    // If rectangle handles are ever needed, use this.createHandle as in other shapes.
    return [];
  }

  private updateFromHandleDirect(newPosition: Point): void {
    // Placeholder for direct drag logic if needed
  }

  updateFromHandle(handle: EditHandle, newPosition: Point): void {
    const { x, y, width, height } = this.shape.getGeometry() as RectangleGeometry;
    const handleIdx = this.handles.indexOf(handle);
    if (handleIdx === -1) return;
    // Opposite corner
    const oppositeIdx = (handleIdx + 2) % 4;
    const anchor = this.handles[oppositeIdx].position;
    // New rectangle from anchor to newPosition
    const newX = Math.min(anchor.x, newPosition.x);
    const newY = Math.min(anchor.y, newPosition.y);
    const newWidth = Math.abs(newPosition.x - anchor.x);
    const newHeight = Math.abs(newPosition.y - anchor.y);
    this.shape.update({ type: 'rectangle', x: newX, y: newY, width: newWidth, height: newHeight });
    this.updateHandlePositions();
  }

  updateHandlePositions(): void {
    const { x, y, width, height } = this.shape.getGeometry() as RectangleGeometry;
    const positions = [
      { x, y }, // NW
      { x: x + width, y }, // NE
      { x: x + width, y: y + height }, // SE
      { x, y: y + height }, // SW
    ];
    this.handles.forEach((handle, i) => {
      handle.position = positions[i];
      handle.element.setAttribute('x', (positions[i].x - 4).toString());
      handle.element.setAttribute('y', (positions[i].y - 4).toString());
    });
  }
} 