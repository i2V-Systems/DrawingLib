import { BaseShape } from './base/BaseShape';
import { Geometry } from '../types/shape.types';

export class EllipseShape extends BaseShape {
  private cx: number = 0;
  private cy: number = 0;
  private rx: number = 0;
  private ry: number = 0;

  getGeometry(): Geometry {
    return {
      type: 'ellipse',
      cx: this.cx,
      cy: this.cy,
      rx: this.rx,
      ry: this.ry
    };
  }

  override getBBox(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.cx - this.rx,
      y: this.cy - this.ry,
      width: this.rx * 2,
      height: this.ry * 2
    };
  }

  constructor(id: string, geometry: Geometry) {
    const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    super(id, ellipse);
    this.update(geometry);
  }

  update(geometry: Geometry): void {
    if (geometry.type !== 'ellipse') {
      throw new Error('Invalid geometry type');
    }

    const { cx, cy, rx, ry } = geometry;
    this.cx = cx;
    this.cy = cy;
    this.rx = rx;
    this.ry = ry;

    this.shapeElement.setAttribute('cx', cx.toString());
    this.shapeElement.setAttribute('cy', cy.toString());
    this.shapeElement.setAttribute('rx', rx.toString());
    this.shapeElement.setAttribute('ry', ry.toString());

    this.updateHandlePositions();
  }

  public override getEditHandles(): { x: number; y: number; type: string; element: SVGCircleElement }[] {
    const positions = [
      { x: this.cx - this.rx, y: this.cy }, // left
      { x: this.cx + this.rx, y: this.cy }, // right
      { x: this.cx, y: this.cy - this.ry }, // top
      { x: this.cx, y: this.cy + this.ry }  // bottom
    ];
    return this.handles.map((handle, i) => ({
      x: positions[i].x,
      y: positions[i].y,
      type: ['left', 'right', 'top', 'bottom'][i],
      element: handle
    }));
  }

  public updateFromHandle(handle: SVGCircleElement, newPosition: { x: number; y: number }): void {
    const idx = this.handles.indexOf(handle);
    if (idx === -1) return;
    switch (idx) {
      case 0: // left
        this.rx = Math.abs(this.cx - newPosition.x);
        break;
      case 1: // right
        this.rx = Math.abs(newPosition.x - this.cx);
        break;
      case 2: // top
        this.ry = Math.abs(this.cy - newPosition.y);
        break;
      case 3: // bottom
        this.ry = Math.abs(newPosition.y - this.cy);
        break;
    }
    this.update({ type: 'ellipse', cx: this.cx, cy: this.cy, rx: this.rx, ry: this.ry });
    this.updateHandlePositions();
  }

  public override moveBy(deltaX: number, deltaY: number): void {
    this.cx += deltaX;
    this.cy += deltaY;
    this.update({ type: 'ellipse', cx: this.cx, cy: this.cy, rx: this.rx, ry: this.ry });
    if (this.handles && this.handles.length > 0) {
      this.updateHandlePositions();
    }
  }

  protected override showEditHandles(): void {
    if (this.handles.length === 0) {
      // Four handles: left, right, top, bottom
      const positions = [
        { x: this.cx - this.rx, y: this.cy },
        { x: this.cx + this.rx, y: this.cy },
        { x: this.cx, y: this.cy - this.ry },
        { x: this.cx, y: this.cy + this.ry }
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
      { x: this.cx - this.rx, y: this.cy },
      { x: this.cx + this.rx, y: this.cy },
      { x: this.cx, y: this.cy - this.ry },
      { x: this.cx, y: this.cy + this.ry }
    ];
    this.handles.forEach((handle, i) => {
      handle.setAttribute('cx', positions[i].x.toString());
      handle.setAttribute('cy', positions[i].y.toString());
    });
  }
}
