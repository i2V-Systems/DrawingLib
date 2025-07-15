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
    this.background.setAttribute('fill', 'white');
    this.background.setAttribute('fill-opacity', '0.8');
    
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
    this.text.setAttribute('x', x.toString());
    this.text.setAttribute('y', y.toString());

    // Set default text styles
    this.text.setAttribute('font-family', 'Arial');
    this.text.setAttribute('font-size', '12px');
    this.text.setAttribute('font-weight', 'normal');
    this.text.setAttribute('font-style', 'normal');
    this.text.setAttribute('fill', 'black');
    this.text.setAttribute('text-decoration', 'none');
    this.text.setAttribute('text-anchor', 'start');
    this.text.setAttribute('dominant-baseline', 'hanging');

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
      if (geometry.style.fill) this.text.setAttribute('fill', geometry.style.fill);
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
}
