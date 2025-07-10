import { BaseSelector } from './BaseSelector';
import { Geometry, PolygonGeometry, Point } from '../types';
import { SVGUtils } from '../../utils/SVGUtils';

export class PolygonSelector extends BaseSelector {
  private polygon: SVGPolygonElement;
  private points: { x: number; y: number }[] = [];
  private isDrawing = false;

  constructor(svg: SVGSVGElement) {
    super(svg);
    this.polygon = SVGUtils.createElement('polygon') as SVGPolygonElement;
    this.element.appendChild(this.polygon);
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
    if (this.points.length < 3) return null;
    return {
      type: 'polygon',
      points: [...this.points]
    } as PolygonGeometry;
  }

  private updatePolygon(includeMousePosition = false, mousePos?: { x: number; y: number }): void {
    const points = [...this.points];
    if (includeMousePosition && mousePos) {
      points.push(mousePos);
    }
    const pointsString = points
      .map(point => `${point.x},${point.y}`)
      .join(' ');
    this.polygon.setAttribute('points', pointsString);
  }

  // Event forwarding handlers
  handleMouseDown(point: Point, event: MouseEvent): void {
    if (event.button === 0) { // Left click only
      this.points.push(point);
      this.isDrawing = true;
      this.updatePolygon();
    }
  }

  handleMouseMove(point: Point, event: MouseEvent): void {
    if (this.isDrawing) {
      this.updatePolygon(true, point);
    }
  }

  // Optionally, handle double-click and keydown if forwarded
  handleDoubleClick?(point: Point, event: MouseEvent): void {
    event.preventDefault();
    if (this.isDrawing) {
      this.points.pop();
      const geometry = this.getGeometry();
      if (geometry) {
        this.complete();
      } else {
        this.cancel();
      }
      this.isDrawing = false;
      this.points = [];
    }
  }

  handleKeyDown?(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cancel();
      this.isDrawing = false;
      this.points = [];
    }
  }
}
