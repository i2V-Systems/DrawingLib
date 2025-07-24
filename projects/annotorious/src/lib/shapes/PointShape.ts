import { BaseShape } from './base/BaseShape';
import { Point, PointGeometry, Geometry } from '../types/shape.types';

export class PointShape extends BaseShape {
  private x: number = 0;
  private y: number = 0;

  constructor(id: string, geometry: PointGeometry) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    super(id, circle);
    this.update(geometry);
  }

  override getGeometry(): Geometry {
    return { type: 'point', x: this.x, y: this.y };
  }

  update(geometry: Geometry): void {
    if (geometry.type !== 'point') {
      throw new Error('Invalid geometry type');
    }

    const { x, y } = geometry;
    this.x = x;
    this.y = y;

    this.shapeElement.setAttribute('cx', x.toString());
    this.shapeElement.setAttribute('cy', y.toString());
    this.shapeElement.setAttribute('r', '6');

    this.updateHandlePositions();
  }

  override getBBox(): { x: number; y: number; width: number; height: number } {
    const size = 6; // Default size for point
    return {
      x: this.x - size,
      y: this.y - size,
      width: size * 2,
      height: size * 2
    };
  }

  /**
   * Override setSelected to handle point-specific selection styling
   */
  override setSelected(selected: boolean): void {
    super.setSelected(selected);
    if (selected) {
      const currentRadius = parseFloat(this.shapeElement.getAttribute('r') || '5');
      this.shapeElement.setAttribute('r', (currentRadius * 1.2).toString());
    } else {
      const size = 6; // Default size for point
      this.shapeElement.setAttribute('r', size.toString());
    }
  }

  /**
   * Override setHovered to handle point-specific hover styling
   */
  override setHovered(hovered: boolean): void {
    super.setHovered(hovered);
    if (hovered) {
      const currentRadius = parseFloat(this.shapeElement.getAttribute('r') || '5');
      this.shapeElement.setAttribute('r', (currentRadius * 1.1).toString());
    } else {
      const size = 6; // Default size for point
      this.shapeElement.setAttribute('r', size.toString());
    }
  }

  /**
   * Override containsPoint to use circle-specific hit detection
   */
  override containsPoint(point: Point): boolean {
    const dx = point.x - this.x;
    const dy = point.y - this.y;
    const size = 6; // Default size for point
    return Math.sqrt(dx * dx + dy * dy) <= size;
  }

  public override getEditHandles(): { x: number; y: number; type: string; element: SVGCircleElement }[] {
    return this.handles.map((handle) => ({
      x: this.x,
      y: this.y,
      type: 'point',
      element: handle
    }));
  }

  public updateFromHandle(handle: SVGCircleElement, newPosition: { x: number; y: number }): void {
    if (this.handles.indexOf(handle) === -1) return;
    this.x = newPosition.x;
    this.y = newPosition.y;
    this.update({ type: 'point', x: this.x, y: this.y });
    this.updateHandlePositions();
  }

  public override moveBy(deltaX: number, deltaY: number): void {
    this.x += deltaX;
    this.y += deltaY;
    this.update({ type: 'point', x: this.x, y: this.y });
    if (this.handles && this.handles.length > 0) {
      this.updateHandlePositions();
    }
  }

  protected override showEditHandles(): void {
    if (this.handles.length === 0) {
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      handle.setAttribute('cx', this.x.toString());
      handle.setAttribute('cy', this.y.toString());
      handle.setAttribute('r', '8');
      handle.setAttribute('class', 'a9s-handle');
      this.handlesGroup.appendChild(handle);
      this.handles = [handle];
    }
    this.updateHandlePositions();
    super.showEditHandles();
  }

  protected override hideEditHandles(): void {
    super.hideEditHandles();
  }

  private updateHandlePositions(): void {
    if (this.handles.length !== 1) return;
    const handle = this.handles[0];
    handle.setAttribute('cx', this.x.toString());
    handle.setAttribute('cy', this.y.toString());
  }
}
