import { BaseShape } from './base/BaseShape';
import { Geometry } from '../types/shape.types';

export class RectangleShape extends BaseShape {
  private rect: SVGRectElement;
  private x: number = 0;
  private y: number = 0;
  private width: number = 0;
  private height: number = 0;

  constructor(id: string, geometry: Geometry) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    super(id, rect);
    this.rect = rect;
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

    this.rect.setAttribute('x', x.toString());
    this.rect.setAttribute('y', y.toString());
    this.rect.setAttribute('width', width.toString());
    this.rect.setAttribute('height', height.toString());
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
}
