import { EditableShape } from './EditableShape';
import { Point } from '../../types/shape.types';
import { Shape } from '../base/Shape';

type EditHandle = {
  position: Point;
  element: SVGElement;
  onDrag: (newPos: Point) => void;
};

type EllipseGeometry = {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

export class EditableEllipse extends EditableShape {
  constructor(shape: Shape) {
    super(shape);
    this.handles = this.createHandles();
  }

  createHandles(): EditHandle[] {
    const { cx, cy, rx, ry } = this.shape.getGeometry() as EllipseGeometry;
    return [
      this.createHandle(cx, cy - ry, (newPos: Point) => this.updateFromHandleDirect(newPos)), // N
      this.createHandle(cx + rx, cy, (newPos: Point) => this.updateFromHandleDirect(newPos)), // E
      this.createHandle(cx, cy + ry, (newPos: Point) => this.updateFromHandleDirect(newPos)), // S
      this.createHandle(cx - rx, cy, (newPos: Point) => this.updateFromHandleDirect(newPos)), // W
    ];
  }

  private updateFromHandleDirect(newPosition: Point): void {
    // Placeholder for direct drag logic if needed
  }

  updateFromHandle(handle: EditHandle, newPosition: Point): void {
    const { cx, cy, rx, ry } = this.shape.getGeometry() as EllipseGeometry;
    const handleIdx = this.handles.indexOf(handle);
    if (handleIdx === -1) return;
    const oppositeIdx = (handleIdx + 2) % 4;
    const anchor = this.handles[oppositeIdx].position;
    let newCx = cx, newCy = cy, newRx = rx, newRy = ry;
    if (handleIdx % 2 === 0) { // N or S: adjust ry
      newCx = anchor.x;
      newCy = (anchor.y + newPosition.y) / 2;
      newRx = Math.abs(newPosition.x - anchor.x) / 2;
      newRy = Math.abs(newPosition.y - anchor.y) / 2;
    } else { // E or W: adjust rx
      newCy = anchor.y;
      newCx = (anchor.x + newPosition.x) / 2;
      newRx = Math.abs(newPosition.x - anchor.x) / 2;
      newRy = Math.abs(newPosition.y - anchor.y) / 2;
    }
    this.shape.update({ type: 'ellipse', cx: newCx, cy: newCy, rx: newRx, ry: newRy });
    this.updateHandlePositions();
  }

  updateHandlePositions(): void {
    const { cx, cy, rx, ry } = this.shape.getGeometry() as EllipseGeometry;
    const positions = [
      { x: cx, y: cy - ry }, // N
      { x: cx + rx, y: cy }, // E
      { x: cx, y: cy + ry }, // S
      { x: cx - rx, y: cy }, // W
    ];
    this.handles.forEach((handle, i) => {
      handle.position = positions[i];
      handle.element.setAttribute('cx', positions[i].x.toString());
      handle.element.setAttribute('cy', positions[i].y.toString());
    });
  }
} 