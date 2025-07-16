import { EditableShape } from './EditableShape';
import { Point } from '../../types/shape.types';
import { Shape } from '../base/Shape';

type EditHandle = {
  position: Point;
  element: SVGElement;
  onDrag: (newPos: Point) => void;
};

type CircleGeometry = {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
};

export class EditableCircle extends EditableShape {
  constructor(shape: Shape) {
    super(shape);
    this.handles = this.createHandles();
  }

  createHandles(): EditHandle[] {
    const { cx, cy, r } = this.shape.getGeometry() as CircleGeometry;
    return [
      this.createHandle(cx, cy - r, (newPos: Point) => this.updateFromHandleDirect(newPos)), // N
      this.createHandle(cx + r, cy, (newPos: Point) => this.updateFromHandleDirect(newPos)), // E
      this.createHandle(cx, cy + r, (newPos: Point) => this.updateFromHandleDirect(newPos)), // S
      this.createHandle(cx - r, cy, (newPos: Point) => this.updateFromHandleDirect(newPos)), // W
    ];
  }

  private updateFromHandleDirect(newPosition: Point): void {
    // Placeholder for direct drag logic if needed
  }

  updateFromHandle(handle: EditHandle, newPosition: Point): void {
    const { cx, cy, r } = this.shape.getGeometry() as CircleGeometry;
    const handleIdx = this.handles.indexOf(handle);
    if (handleIdx === -1) return;
    const oppositeIdx = (handleIdx + 2) % 4;
    const anchor = this.handles[oppositeIdx].position;
    let newCx = cx, newCy = cy, newR = r;
    if (handleIdx % 2 === 0) { // N or S
      newCx = anchor.x;
      newCy = (anchor.y + newPosition.y) / 2;
      newR = Math.abs(newPosition.y - anchor.y) / 2;
    } else { // E or W
      newCy = anchor.y;
      newCx = (anchor.x + newPosition.x) / 2;
      newR = Math.abs(newPosition.x - anchor.x) / 2;
    }
    this.shape.update({ type: 'circle', cx: newCx, cy: newCy, r: newR });
    this.updateHandlePositions();
  }

  updateHandlePositions(): void {
    const { cx, cy, r } = this.shape.getGeometry() as CircleGeometry;
    const positions = [
      { x: cx, y: cy - r }, // N
      { x: cx + r, y: cy }, // E
      { x: cx, y: cy + r }, // S
      { x: cx - r, y: cy }, // W
    ];
    this.handles.forEach((handle, i) => {
      handle.position = positions[i];
      handle.element.setAttribute('cx', positions[i].x.toString());
      handle.element.setAttribute('cy', positions[i].y.toString());
    });
  }
} 