import { BaseShape } from './base/BaseShape';
import { Geometry, TextGeometry } from '../types/shape.types';

export class TextShape extends BaseShape {
  private text: SVGTextElement;
  private background: SVGRectElement;
  private group: SVGGElement;
  private x: number = 0;
  private y: number = 0;
  private width: number = 0;
  private height: number = 0;


  override getBBox(): { x: number; y: number; width: number; height: number } {
    const bbox = this.text.getBBox();
    return {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height
    };
  }

  private content: string = '';

  constructor(id: string, geometry: Geometry) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    group.appendChild(background);
    group.appendChild(text);

    super(id, group);
    this.group = group;
    this.background = background;
    this.text = text;

    // Set default text styles
    this.text.setAttribute('dominant-baseline', 'hanging');
    // this.background.setAttribute('fill', 'white'); // Removed fill
    // this.background.setAttribute('fill-opacity', '0.8'); // Removed fill

    this.update(geometry);
  }

  update(geometry: Geometry): void {
    if (geometry.type !== 'text') {
      throw new Error('Invalid geometry type');
    }

    const { x, y, width, height, text } = geometry as TextGeometry;

    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.content = text;

    // Update text content and position
    this.text.textContent = text;
    // Center the text in the rectangle
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    this.text.setAttribute('x', centerX.toString());
    this.text.setAttribute('y', centerY.toString());
    this.text.setAttribute('text-anchor', 'middle');
    this.text.setAttribute('dominant-baseline', 'middle');

    // Set default text styles
    this.text.setAttribute('font-family', 'Arial');
    this.text.setAttribute('font-size', '12px');
    this.text.setAttribute('font-weight', 'normal');
    this.text.setAttribute('font-style', 'normal');
    this.text.setAttribute('fill', 'black'); // Default fill restored
    this.text.setAttribute('text-decoration', 'none');
    // Remove or override any other values for text-anchor and dominant-baseline
    // (already set above)

    // Update background
    this.background.setAttribute('x', x.toString());
    this.background.setAttribute('y', y.toString());
    this.background.setAttribute('width', width.toString());
    this.background.setAttribute('height', height.toString());

    // Apply text styles if provided
    if (geometry.style) {
      if (geometry.style.fontFamily) this.text.style.fontFamily = geometry.style.fontFamily;
      if (geometry.style.fontSize) this.text.style.fontSize = `${geometry.style.fontSize}px`;
      if (geometry.style.fontWeight) this.text.style.fontWeight = geometry.style.fontWeight;
      if (geometry.style.fontStyle) this.text.style.fontStyle = geometry.style.fontStyle;
      if (geometry.style.fill) this.text.setAttribute('fill', geometry.style.fill); // Allow override
      if (geometry.style.stroke) this.text.setAttribute('stroke', geometry.style.stroke);
      if (geometry.style.strokeWidth) this.text.setAttribute('stroke-width', geometry.style.strokeWidth.toString());
    }
  }

  protected override setDefaultStyles(): void {
    // No-op: styles are set directly on text and background elements
  }

  override getGeometry(): Geometry {
    return {
      type: 'text',
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      text: this.content,
      style: {}
    };
  }

  public override getEditHandles(): { x: number; y: number; type: string; element: SVGCircleElement }[] {
    const positions = [
      { x: this.x, y: this.y },
      { x: this.x + this.width, y: this.y },
      { x: this.x + this.width, y: this.y + this.height },
      { x: this.x, y: this.y + this.height }
    ];
    return this.handles.map((handle, i) => ({
      x: positions[i].x,
      y: positions[i].y,
      type: 'corner',
      element: handle
    }));
  }

  public updateFromHandle(handle: SVGCircleElement, newPosition: { x: number; y: number }): void {
    const idx = this.handles.indexOf(handle);
    if (idx === -1) return;
    // 0: NW, 1: NE, 2: SE, 3: SW
    let x1 = this.x, y1 = this.y, x2 = this.x + this.width, y2 = this.y + this.height;
    switch (idx) {
      case 0: x1 = newPosition.x; y1 = newPosition.y; break;
      case 1: x2 = newPosition.x; y1 = newPosition.y; break;
      case 2: x2 = newPosition.x; y2 = newPosition.y; break;
      case 3: x1 = newPosition.x; y2 = newPosition.y; break;
    }
    // Normalize coordinates
    const nx = Math.min(x1, x2), ny = Math.min(y1, y2);
    const nw = Math.abs(x2 - x1), nh = Math.abs(y2 - y1);
    this.update({ type: 'text', x: nx, y: ny, width: nw, height: nh, text: this.content, style: {} });
    this.updateHandlePositions();
  }

  public override moveBy(deltaX: number, deltaY: number): void {
    this.x += deltaX;
    this.y += deltaY;
    this.update({ type: 'text', x: this.x, y: this.y, width: this.width, height: this.height, text: this.content, style: {} });
    if (this.handles && this.handles.length > 0) {
      this.updateHandlePositions();
    }
  }

  protected override showEditHandles(): void {
    this.hideEditHandles();
    // Four corners: NW, NE, SE, SW
    const positions = [
      { x: this.x, y: this.y },
      { x: this.x + this.width, y: this.y },
      { x: this.x + this.width, y: this.y + this.height },
      { x: this.x, y: this.y + this.height }
    ];
    this.handles = positions.map(pos => {
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      handle.setAttribute('cx', pos.x.toString());
      handle.setAttribute('cy', pos.y.toString());
      handle.setAttribute('r', '6');
      handle.setAttribute('class', 'a9s-handle');
      this.handlesGroup.appendChild(handle);
      return handle;
    });
    super.showEditHandles();
  }

  protected override hideEditHandles(): void {
    this.handles.forEach(handle => {
      handle.parentNode?.removeChild(handle);
    });
    this.handles = [];
  }

  private updateHandlePositions(): void {
    if (this.handles.length !== 4) return;
    const positions = [
      { x: this.x, y: this.y },
      { x: this.x + this.width, y: this.y },
      { x: this.x + this.width, y: this.y + this.height },
      { x: this.x, y: this.y + this.height }
    ];
    this.handles.forEach((handle, i) => {
      handle.setAttribute('cx', positions[i].x.toString());
      handle.setAttribute('cy', positions[i].y.toString());
    });
  }

  public override containsPoint(point: { x: number; y: number }): boolean {
    const tol = 5;
    const left = Math.abs(point.x - this.x) <= tol && point.y >= this.y - tol && point.y <= this.y + this.height + tol;
    const right = Math.abs(point.x - (this.x + this.width)) <= tol && point.y >= this.y - tol && point.y <= this.y + this.height + tol;
    const top = Math.abs(point.y - this.y) <= tol && point.x >= this.x - tol && point.x <= this.x + this.width + tol;
    const bottom = Math.abs(point.y - (this.y + this.height)) <= tol && point.x >= this.x - tol && point.x <= this.x + this.width + tol;
    // Exclude inside
    const inside = point.x > this.x + tol && point.x < this.x + this.width - tol && point.y > this.y + tol && point.y < this.y + this.height - tol;
    return (left || right || top || bottom) && !inside;
  }
}
