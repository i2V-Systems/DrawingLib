import { BaseShape } from './base/BaseShape';
import { Geometry } from '../types/shape.types';
import { SVGUtils } from '../utils/SVGUtils';

export class CircleShape extends BaseShape {
  private circle: SVGCircleElement;
  private cx: number = 0;
  private cy: number = 0;
  private r: number = 0;

  constructor(id: string, geometry: Geometry) {
    const circle = SVGUtils.createElement('circle') as SVGCircleElement;
    super(id, circle);
    this.circle = circle;
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

    this.circle.setAttribute('cx', cx.toString());
    this.circle.setAttribute('cy', cy.toString());
    this.circle.setAttribute('r', r.toString());
  }
}
