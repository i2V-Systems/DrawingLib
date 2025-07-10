import { BaseSelector } from './BaseSelector';
import { Geometry, EllipseGeometry, Point } from '../types';
import { SVGUtils } from '../../utils/SVGUtils';

export class EllipseSelector extends BaseSelector {
  private ellipse: SVGEllipseElement;
  private startPoint: { x: number; y: number } | null = null;

  constructor(svg: SVGSVGElement) {
    super(svg);
    this.ellipse = SVGUtils.createElement('ellipse') as SVGEllipseElement;
    this.element.appendChild(this.ellipse);
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
    const rx = parseFloat(this.ellipse.getAttribute('rx') || '0');
    const ry = parseFloat(this.ellipse.getAttribute('ry') || '0');
    const cx = parseFloat(this.ellipse.getAttribute('cx') || '0');
    const cy = parseFloat(this.ellipse.getAttribute('cy') || '0');
    if (rx === 0 || ry === 0) return null;
    return {
      type: 'ellipse',
      cx,
      cy,
      rx,
      ry
    } as EllipseGeometry;
  }

  handleMouseDown(point: Point, event: MouseEvent): void {
    if (event.button === 0) {
      this.startPoint = point;
      this.ellipse.setAttribute('cx', point.x.toString());
      this.ellipse.setAttribute('cy', point.y.toString());
      this.ellipse.setAttribute('rx', '0');
      this.ellipse.setAttribute('ry', '0');
    }
  }

  handleMouseMove(point: Point, event: MouseEvent): void {
    if (this.startPoint) {
      const rx = Math.abs(point.x - this.startPoint.x) / 2;
      const ry = Math.abs(point.y - this.startPoint.y) / 2;
      const cx = this.startPoint.x + (point.x - this.startPoint.x) / 2;
      const cy = this.startPoint.y + (point.y - this.startPoint.y) / 2;
      this.ellipse.setAttribute('cx', cx.toString());
      this.ellipse.setAttribute('cy', cy.toString());
      this.ellipse.setAttribute('rx', rx.toString());
      this.ellipse.setAttribute('ry', ry.toString());
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
