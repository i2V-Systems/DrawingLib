import { BaseShape } from './base/BaseShape';
import { Geometry, FreehandGeometry, Point } from '../types/shape.types';

export class FreehandShape extends BaseShape {
  private geometry: FreehandGeometry;
  private pathElement: SVGPathElement;
  private handlePoints: { point: Point; originalIndex: number }[] = [];

  constructor(id: string, geometry: Geometry) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    super(id, path);
    this.pathElement = path;
    this.geometry = geometry as FreehandGeometry;
    this.update(geometry);
  }

  update(geometry: Geometry): void {
    if (geometry.type !== 'freehand') {
      throw new Error('Invalid geometry type for FreehandShape');
    }

    this.geometry = geometry as FreehandGeometry;
    this.updatePath();
  }

  getGeometry(): Geometry {
    return { ...this.geometry };
  }

  private updatePath(): void {
    if (this.geometry.points && this.geometry.points.length > 0) {
      const pathData = this.geometry.points.map((point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${command} ${point.x} ${point.y}`;
      }).join(' ');
      
      // Close the path if it has enough points
      if (this.geometry.points.length > 2) {
        this.pathElement.setAttribute('d', `${pathData} Z`);
      } else {
        this.pathElement.setAttribute('d', pathData);
      }
    }
  }

  override getBBox(): { x: number; y: number; width: number; height: number } {
    if (!this.geometry.points || this.geometry.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const xs = this.geometry.points.map(p => p.x);
    const ys = this.geometry.points.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  override updateOutline(): void {
    if (this.selectionOutline) {
      const points = this.geometry.points.map(p => `${p.x},${p.y}`).join(' ');
      this.selectionOutline.setAttribute('points', points);
    }
  }

  public override containsPoint(point: { x: number; y: number }): boolean {
    const tol = 5;
    if (!this.geometry.points || this.geometry.points.length < 2) return false;
    for (let i = 0; i < this.geometry.points.length - 1; i++) {
      const a = this.geometry.points[i];
      const b = this.geometry.points[i + 1];
      // Distance from point to segment ab
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lengthSq = dx * dx + dy * dy;
      let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq;
      t = Math.max(0, Math.min(1, t));
      const projX = a.x + t * dx;
      const projY = a.y + t * dy;
      const dist = Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
      if (dist <= tol) return true;
    }
    return false;
  }

  public override getEditHandles(): { x: number; y: number; type: string; element: SVGCircleElement }[] {
    return this.handles.map((handle, i) => ({
      x: this.handlePoints[i].point.x,
      y: this.handlePoints[i].point.y,
      type: 'vertex',
      element: handle
    }));
  }

  public updateFromHandle(handle: SVGCircleElement, newPosition: { x: number; y: number }): void {
    const idx = this.handles.indexOf(handle);
    if (idx === -1) return;

    const originalIndex = this.handlePoints[idx].originalIndex;
    this.geometry.points[originalIndex] = { x: newPosition.x, y: newPosition.y };
    this.update({ ...this.geometry });
    this.updateHandlePositions();
  }

  public override moveBy(deltaX: number, deltaY: number): void {
    this.geometry.points = this.geometry.points.map(pt => ({ x: pt.x + deltaX, y: pt.y + deltaY }));
    this.update({ ...this.geometry });
    if (this.handles && this.handles.length > 0) {
      this.updateHandlePositions();
    }
  }

  protected override showEditHandles(): void {
    this.hideEditHandles();
    const handleInterval = 1;
    this.handlePoints = [];
    const currentStyle = this.getCurrentStyle();
    const handleSize = currentStyle ? currentStyle.handleSize : 6;
      
    this.handles = this.geometry.points.reduce((handles, pt, i) => {
      if (i % handleInterval === 0) {
        this.handlePoints.push({ point: pt, originalIndex: i });
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        handle.setAttribute('cx', pt.x.toString());
        handle.setAttribute('cy', pt.y.toString());
        handle.setAttribute('r', (handleSize / 2).toString());
        handle.setAttribute('class', 'a9s-handle');
        this.pathElement.parentNode?.appendChild(handle);
        handles.push(handle);
      }
      return handles;
    }, [] as SVGCircleElement[]);
  }

  protected override hideEditHandles(): void {
    this.handles.forEach(handle => {
      handle.parentNode?.removeChild(handle);
    });
    this.handles = [];
    this.handlePoints = [];
  }

  private updateHandlePositions(): void {
    if (this.handles.length !== this.handlePoints.length) return;
    this.handles.forEach((handle, i) => {
      const originalIndex = this.handlePoints[i].originalIndex;
      const point = this.geometry.points[originalIndex];
      this.handlePoints[i].point = point;
      handle.setAttribute('cx', point.x.toString());
      handle.setAttribute('cy', point.y.toString());
    });
  }
}
 