import { BaseShape } from './base/BaseShape';
import { Geometry } from '../types/shape.types';

export class RectangleShape extends BaseShape {
  // shapeElement is now the rect, managed by BaseShape
  private x: number = 0;
  private y: number = 0;
  private width: number = 0;
  private height: number = 0;


  constructor(id: string, geometry: Geometry) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    super(id, rect);
    this.update(geometry);
  }

  update(geometry: Geometry): void {
    if (geometry.type !== 'rectangle') {
      throw new Error('Invalid geometry type');
    }

    const { x, y, width, height } = geometry;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.shapeElement.setAttribute('x', x.toString());
    this.shapeElement.setAttribute('y', y.toString());
    this.shapeElement.setAttribute('width', width.toString());
    this.shapeElement.setAttribute('height', height.toString());

    this.updateHandlePositions();
  }

  getGeometry(): Geometry {
    return {
      type: 'rectangle',
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }


  public override getEditHandles(): { x: number; y: number; type: string; element: SVGCircleElement }[] {
    const positions = [
      { x: this.x, y: this.y },
      { x: this.x + this.width, y: this.y },
      { x: this.x + this.width, y: this.y + this.height },
      { x: this.x, y: this.y + this.height }
    ];
    return this.handles.map((handle, i) => ({
      x: positions[i].x,
      y: positions[i].y,
      type: 'corner',
      element: handle
    }));
  }

  public updateFromHandle(handle: SVGCircleElement, newPosition: { x: number; y: number }): void {
    const idx = this.handles.indexOf(handle);
    if (idx === -1) return;
    // 0: NW, 1: NE, 2: SE, 3: SW
    let x1 = this.x, y1 = this.y, x2 = this.x + this.width, y2 = this.y + this.height;
    switch (idx) {
      case 0: x1 = newPosition.x; y1 = newPosition.y; break;
      case 1: x2 = newPosition.x; y1 = newPosition.y; break;
      case 2: x2 = newPosition.x; y2 = newPosition.y; break;
      case 3: x1 = newPosition.x; y2 = newPosition.y; break;
    }
    // Normalize coordinates
    const nx = Math.min(x1, x2), ny = Math.min(y1, y2);
    const nw = Math.abs(x2 - x1), nh = Math.abs(y2 - y1);
    this.update({ type: 'rectangle', x: nx, y: ny, width: nw, height: nh });
    this.updateHandlePositions();
  }

  public override moveBy(deltaX: number, deltaY: number): void {
    this.x += deltaX;
    this.y += deltaY;
    this.update({ type: 'rectangle', x: this.x, y: this.y, width: this.width, height: this.height });
    if (this.handles && this.handles.length > 0) {
      this.updateHandlePositions();
    }
  }

  protected override showEditHandles(): void {
    // Only create handles if they don't exist
    if (this.handles.length === 0) {
      // Four corners: NW, NE, SE, SW
      const positions = [
        { x: this.x, y: this.y },
        { x: this.x + this.width, y: this.y },
        { x: this.x + this.width, y: this.y + this.height },
        { x: this.x, y: this.y + this.height }
      ];
      this.handles = positions.map(pos => {
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        handle.setAttribute('cx', pos.x.toString());
        handle.setAttribute('cy', pos.y.toString());
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
    if (this.handles.length !== 4) return;
    const positions = [
      { x: this.x, y: this.y },
      { x: this.x + this.width, y: this.y },
      { x: this.x + this.width, y: this.y + this.height },
      { x: this.x, y: this.y + this.height }
    ];
    this.handles.forEach((handle, i) => {
      handle.setAttribute('cx', positions[i].x.toString());
      handle.setAttribute('cy', positions[i].y.toString());
    });
  }

  public override containsPoint(point: { x: number; y: number }): boolean {
    const tol = 5;
    const left = Math.abs(point.x - this.x) <= tol && point.y >= this.y - tol && point.y <= this.y + this.height + tol;
    const right = Math.abs(point.x - (this.x + this.width)) <= tol && point.y >= this.y - tol && point.y <= this.y + this.height + tol;
    const top = Math.abs(point.y - this.y) <= tol && point.x >= this.x - tol && point.x <= this.x + this.width + tol;
    const bottom = Math.abs(point.y - (this.y + this.height)) <= tol && point.x >= this.x - tol && point.x <= this.x + this.width + tol;
    // Exclude inside
    const inside = point.x > this.x + tol && point.x < this.x + this.width - tol && point.y > this.y + tol && point.y < this.y + this.height - tol;
    return (left || right || top || bottom) && !inside;
  }
}
