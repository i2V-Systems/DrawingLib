import { BaseShape } from './base/BaseShape';
import { Geometry, Point } from './types';

export class PolygonShape extends BaseShape {
  private polygon: SVGPolygonElement;
  private points: Array<Point> = [];

  constructor(id: string, geometry: Geometry) {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    super(id, polygon);
    this.polygon = polygon;
    this.update(geometry);
  }

  update(geometry: Geometry): void {
    if (geometry.type !== 'polygon') {
      throw new Error('Invalid geometry type');
    }

    this.points = geometry.points;
    const points = this.points.map(p => `${p.x},${p.y}`).join(' ');
    this.polygon.setAttribute('points', points);
  }

  getGeometry(): Geometry {
    return {
      type: 'polygon',
      points: this.points,
    };
  }
}
