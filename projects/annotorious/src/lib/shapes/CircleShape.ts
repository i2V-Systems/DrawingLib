import { BaseShape } from './base/BaseShape';
import { Geometry } from '../types/shape.types';
import { SVGUtils } from '../utils/SVGUtils';

export class CircleShape extends BaseShape {
  private cx: number = 0;
  private cy: number = 0;
  private r: number = 0;

  constructor(id: string, geometry: Geometry) {
    const circle = SVGUtils.createElement('circle') as SVGCircleElement;
    super(id, circle);
    this.update(geometry);
  }

  getGeometry(): Geometry {
    return {
      type: 'circle',
      cx: this.cx,
      cy: this.cy,
      r: this.r
    };
  }

  update(geometry: Geometry): void {
    if (geometry.type !== 'circle') {
      throw new Error('Invalid geometry type');
    }

    const { cx, cy, r } = geometry;
    this.cx = cx;
    this.cy = cy;
    this.r = r;

    this.shapeElement.setAttribute('cx', cx.toString());
    this.shapeElement.setAttribute('cy', cy.toString());
    this.shapeElement.setAttribute('r', r.toString());
  }

  public override getEditHandles(): { x: number; y: number; type: string; element: SVGCircleElement }[] {
    const positions = [
      { x: this.cx, y: this.cy }, // center
      { x: this.cx + this.r, y: this.cy } // circumference (east)
    ];
    return this.handles.map((handle, i) => ({
      x: positions[i].x,
      y: positions[i].y,
      type: i === 0 ? 'center' : 'radius',
      element: handle
    }));
  }

  public updateFromHandle(handle: SVGCircleElement, newPosition: { x: number; y: number }): void {
    const idx = this.handles.indexOf(handle);
    if (idx === 0) {
      // Move center
      this.cx = newPosition.x;
      this.cy = newPosition.y;
    } else if (idx === 1) {
      // Change radius
      this.r = Math.sqrt(Math.pow(newPosition.x - this.cx, 2) + Math.pow(newPosition.y - this.cy, 2));
    }
    this.update({ type: 'circle', cx: this.cx, cy: this.cy, r: this.r });
    this.updateHandlePositions();
  }

  public override moveBy(deltaX: number, deltaY: number): void {
    this.cx += deltaX;
    this.cy += deltaY;
    this.update({ type: 'circle', cx: this.cx, cy: this.cy, r: this.r });
    if (this.handles && this.handles.length > 0) {
      this.updateHandlePositions();
    }
  }

  protected override showEditHandles(): void {
    if (this.handles.length === 0) {
      // Center and circumference (east)
      const positions = [
        { x: this.cx, y: this.cy },
        { x: this.cx + this.r, y: this.cy }
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
    if (this.handles.length !== 2) return;
    const positions = [
      { x: this.cx, y: this.cy },
      { x: this.cx + this.r, y: this.cy }
    ];
    this.handles.forEach((handle, i) => {
      handle.setAttribute('cx', positions[i].x.toString());
      handle.setAttribute('cy', positions[i].y.toString());
    });
  }
}
