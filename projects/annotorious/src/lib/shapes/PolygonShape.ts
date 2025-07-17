import { BaseShape } from './base/BaseShape';
import { Geometry, Point } from '../types/shape.types';

export class PolygonShape extends BaseShape {
  private points: Array<Point> = [];

  constructor(id: string, geometry: Geometry) {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    super(id, polygon);
    this.update(geometry);
  }

  update(geometry: Geometry): void {
    if (geometry.type !== 'polygon') {
      throw new Error('Invalid geometry type');
    }

    this.points = geometry.points;
    const points = this.points.map(p => `${p.x},${p.y}`).join(' ');
    this.shapeElement.setAttribute('points', points);

  }

  getGeometry(): Geometry {
    return {
      type: 'polygon',
      points: this.points,
    };
  }

  /**
   * Move the polygon by delta
   */
  override moveBy(deltaX: number, deltaY: number): void {
    this.points = this.points.map(point => ({
      x: point.x + deltaX,
      y: point.y + deltaY
    }));
    this.update({ type: 'polygon', points: this.points });
    this.emit('geometryChanged', { geometry: this.getGeometry() });
  }

  protected override showEditHandles(): void {
    if (this.handles.length === 0) {
      this.handles = this.points.map((pt) => {
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        handle.setAttribute('cx', pt.x.toString());
        handle.setAttribute('cy', pt.y.toString());
        handle.setAttribute('r', '6');
        handle.setAttribute('class', 'a9s-handle');
        this.handlesGroup.appendChild(handle);
        return handle;
      });
    }
    this.updateHandlePositions();
    super.showEditHandles();
  }

  protected override hideEditHandles(): void {
    super.hideEditHandles();
  }

  private updateHandlePositions(): void {
    if (this.handles.length !== this.points.length) return;
    this.handles.forEach((handle, i) => {
      handle.setAttribute('cx', this.points[i].x.toString());
      handle.setAttribute('cy', this.points[i].y.toString());
    });
  }

  public updateFromHandle(handle: SVGCircleElement, newPosition: { x: number; y: number }): void {
    const idx = this.handles.indexOf(handle);
    if (idx === -1) return;
    this.points[idx] = { x: newPosition.x, y: newPosition.y };
    this.update({ type: 'polygon', points: this.points });
    this.updateHandlePositions();
  }

  public override getEditHandles(): { x: number; y: number; type: string; element: SVGCircleElement }[] {
    return this.handles.map((handle, i) => ({
      x: this.points[i].x,
      y: this.points[i].y,
      type: 'vertex',
      element: handle
    }));
  }
}
