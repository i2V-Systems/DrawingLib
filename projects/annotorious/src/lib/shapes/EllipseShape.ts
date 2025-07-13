import { BaseShape } from './base/BaseShape';
import { Geometry } from '../types/shape.types';

export class EllipseShape extends BaseShape {
  private ellipse: SVGEllipseElement;
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
    this.ellipse = ellipse;
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

    this.ellipse.setAttribute('cx', cx.toString());
    this.ellipse.setAttribute('cy', cy.toString());
    this.ellipse.setAttribute('rx', rx.toString());
    this.ellipse.setAttribute('ry', ry.toString());
  }
}
