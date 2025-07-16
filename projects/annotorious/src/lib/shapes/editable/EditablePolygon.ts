import { EditableShape } from './EditableShape';
import { Point } from '../../types/shape.types';
import { Shape } from '../base/Shape';

type EditHandle = {
  position: Point;
  element: SVGElement;
  onDrag: (newPos: Point) => void;
};

type PolygonGeometry = {
  type: 'polygon';
  points: Point[];
};

export class EditablePolygon extends EditableShape {
  constructor(shape: Shape) {
    super(shape);
    this.handles = this.createHandles();
  }

  createHandles(): EditHandle[] {
    const { points } = this.shape.getGeometry() as PolygonGeometry;
    return points.map(({ x, y }) =>
      this.createHandle(x, y, (newPos: Point) => this.updateFromHandleDirect(newPos))
    );
  }

  private updateFromHandleDirect(newPosition: Point): void {
    // Placeholder for direct drag logic if needed
  }

  updateFromHandle(handle: EditHandle, newPosition: Point): void {
    const { points } = this.shape.getGeometry() as PolygonGeometry;
    const handleIdx = this.handles.indexOf(handle);
    if (handleIdx === -1) return;
    const newPoints = points.map((pt, i) =>
      i === handleIdx ? { x: newPosition.x, y: newPosition.y } : pt
    );
    this.shape.update({ type: 'polygon', points: newPoints });
    this.updateHandlePositions();
  }

  updateHandlePositions(): void {
    const { points } = this.shape.getGeometry() as PolygonGeometry;
    this.handles.forEach((handle, i) => {
      handle.position = points[i];
      handle.element.setAttribute('cx', points[i].x.toString());
      handle.element.setAttribute('cy', points[i].y.toString());
    });
  }
} 