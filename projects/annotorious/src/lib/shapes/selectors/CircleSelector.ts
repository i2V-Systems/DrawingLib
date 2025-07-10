import { BaseSelector } from './BaseSelector';
import { Geometry, CircleGeometry, Point } from '../types';
import { SVGUtils } from '../../utils/SVGUtils';

export class CircleSelector extends BaseSelector {
  private circle: SVGCircleElement;
  private center: { x: number; y: number } | null = null;

  constructor(svg: SVGSVGElement) {
    super(svg);
    this.circle = SVGUtils.createElement('circle') as SVGCircleElement;
    this.element.appendChild(this.circle);
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
    const r = parseFloat(this.circle.getAttribute('r') || '0');
    if (r === 0 || !this.center) return null;
    return {
      type: 'circle',
      cx: this.center.x,
      cy: this.center.y,
      r
    } as CircleGeometry;
  }

  handleMouseDown(point: Point, event: MouseEvent): void {
    if (event.button === 0) {
      this.center = point;
      this.circle.setAttribute('cx', point.x.toString());
      this.circle.setAttribute('cy', point.y.toString());
      this.circle.setAttribute('r', '0');
    }
  }

  handleMouseMove(point: Point, event: MouseEvent): void {
    if (this.center) {
      const radius = Math.sqrt(
        Math.pow(point.x - this.center.x, 2) +
        Math.pow(point.y - this.center.y, 2)
      );
      this.circle.setAttribute('r', radius.toString());
    }
  }

  handleMouseUp(point: Point, event: MouseEvent): void {
    if (event.button === 0 && this.center) {
      const geometry = this.getGeometry();
      if (geometry) {
        this.complete();
      } else {
        this.cancel();
      }
      this.center = null;
    }
  }
}
