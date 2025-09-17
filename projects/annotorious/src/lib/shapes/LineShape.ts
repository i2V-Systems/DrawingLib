import { BaseShape } from './base/BaseShape';
import { Geometry, Point } from '../types/shape.types';

export default class LineShape extends BaseShape {
  private points!: [Point, Point];
  private lineElement: SVGLineElement;

  constructor(id: string, geometry: Geometry) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'annotation-shape');
    super(id, line);
    this.lineElement = line as SVGLineElement;
    this.update(geometry);
  }

  override update(geometry: Geometry): void {
    if (geometry.type !== 'line') throw new Error('Invalid geometry type');
    if (!geometry.points || geometry.points.length !== 2)
      throw new Error('Line requires exactly 2 points');
    this.points = [{ ...geometry.points[0] }, { ...geometry.points[1] }];
    this.updateLine();
    this.updateHandlePositions();
    this.updateOutline();
  }

  getGeometry(): Geometry {
    return {
      type: 'line',
      points: [{ ...this.points[0] }, { ...this.points[1] }],
    };
  }

  override moveBy(deltaX: number, deltaY: number): void {
    this.points = this.points.map((p) => ({
      x: p.x + deltaX,
      y: p.y + deltaY,
    })) as [Point, Point];
    this.updateLine();
    this.updateOutline();
    this.updateHandlePositions();
  }

  override containsPoint(point: Point): boolean {
    const tol = 5;
    const [a, b]: [Point, Point] = this.points;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return false;
    let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    const dist = Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
    return dist < tol;
  }

  override applyStyle(style: any): void {
    super.applyStyle(style);
  }

  protected override showEditHandles(): void {
    if (this.handles.length > 0) {
      super.showEditHandles();
      return;
    }
    const currentStyle = this.getCurrentStyle();
    const handleSize = currentStyle ? currentStyle.handleSize ?? 6 : 6;
    this.handles = this.points.map((pt) => {
      const handle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      );
      handle.setAttribute('cx', pt.x.toString());
      handle.setAttribute('cy', pt.y.toString());
      handle.setAttribute('r', (handleSize / 2).toString());
      handle.setAttribute('class', 'a9s-handle');
      this.handlesGroup.appendChild(handle);
      return handle;
    });
    this.updateHandlePositions();
    super.showEditHandles();
  }

  public updateFromHandle(handle: SVGCircleElement, newPosition: Point): void {
    const idx = this.handles.indexOf(handle);
    if (idx === -1) return;
    this.points[idx] = { x: newPosition.x, y: newPosition.y };
    this.updateLine();
    this.updateOutline();
    this.updateHandlePositions();
  }

  public override getEditHandles(): Array<{
    x: number;
    y: number;
    type: string;
    element: SVGCircleElement;
  }> {
    return this.handles.map((handle, i) => ({
      x: this.points[i].x,
      y: this.points[i].y,
      type: 'vertex',
      element: handle,
    }));
  }

  protected override hideEditHandles(): void {
    super.hideEditHandles();
  }

  override updateOutline(): void {
    if (this.selectionOutline && this.points?.length === 2) {
      const { 0: a, 1: b } = this.points;
      const sel = this.selectionOutline as unknown as SVGLineElement;
      sel.setAttribute('x1', a.x.toString());
      sel.setAttribute('y1', a.y.toString());
      sel.setAttribute('x2', b.x.toString());
      sel.setAttribute('y2', b.y.toString());
    }
  }

  private updateLine(): void {
    const [a, b] = this.points;
    this.lineElement.setAttribute('x1', a.x.toString());
    this.lineElement.setAttribute('y1', a.y.toString());
    this.lineElement.setAttribute('x2', b.x.toString());
    this.lineElement.setAttribute('y2', b.y.toString());
  }

  private updateHandlePositions(): void {
    if (this.handles.length !== 2) return;
    this.handles.forEach((handle, i) => {
      handle.setAttribute('cx', this.points[i].x.toString());
      handle.setAttribute('cy', this.points[i].y.toString());
    });
  }
}
