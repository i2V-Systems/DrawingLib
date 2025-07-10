import { BaseSelector } from './BaseSelector';
import { Geometry, Point } from '../types';
import { SVGUtils } from '../../utils/SVGUtils';

export class RectangleSelector extends BaseSelector {
  private rect: SVGRectElement;
  private startPoint: { x: number; y: number } | null = null;

  constructor(svg: SVGSVGElement) {
    super(svg);
    this.rect = SVGUtils.createElement('rect') as SVGRectElement;
    this.element.appendChild(this.rect);
    this.setStyles({
      'fill': 'none',
      'stroke': '#000',
      'stroke-width': '2px',
      'stroke-dasharray': '4'
    });
  }

  // No-op: no direct event listeners
  protected attachEventListeners(): void {}
  protected detachEventListeners(): void {}

  getGeometry(): Geometry | null {
    const bbox = this.rect.getBBox();
    if (bbox.width === 0 || bbox.height === 0) return null;
    return {
      type: 'rectangle',
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height
    };
  }

  handleMouseDown(point: Point, event: MouseEvent): void {
    if (event.button === 0) {
      this.startPoint = point;
      this.rect.setAttribute('x', point.x.toString());
      this.rect.setAttribute('y', point.y.toString());
      this.rect.setAttribute('width', '0');
      this.rect.setAttribute('height', '0');
    }
  }

  handleMouseMove(point: Point, event: MouseEvent): void {
    if (this.startPoint) {
      const x = Math.min(this.startPoint.x, point.x);
      const y = Math.min(this.startPoint.y, point.y);
      const width = Math.abs(point.x - this.startPoint.x);
      const height = Math.abs(point.y - this.startPoint.y);
      this.rect.setAttribute('x', x.toString());
      this.rect.setAttribute('y', y.toString());
      this.rect.setAttribute('width', width.toString());
      this.rect.setAttribute('height', height.toString());
    }
  }

  handleMouseUp(point: Point, event: MouseEvent): void {
    if (event.button === 0 && this.startPoint) {
      const geometry = this.getGeometry();
      if (geometry) {
        this.complete();
      } else {
        this.cancel();
      }
      this.startPoint = null;
    }
  }
}
