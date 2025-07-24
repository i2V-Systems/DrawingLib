import { BaseShape } from './base/BaseShape';
import { Geometry, TextGeometry } from '../types/shape.types';
import { ShapeStyle } from '../core/managers/StyleManager';

export class TextShape extends BaseShape {
  private text: SVGTextElement;
  private x: number = 0;
  private y: number = 0;
  private content: string = '';

  constructor(id: string, geometry: Geometry) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.classList.add('annotation-text');
    
    super(id, text);
    this.text = text;

    // Set default text attributes
    this.text.setAttribute('dominant-baseline', 'middle');
    this.text.setAttribute('text-anchor', 'middle');
    
    this.update(geometry);
  }

  override update(geometry: Geometry): void {
    if (geometry.type !== 'text') {
      throw new Error('Invalid geometry type for TextShape');
    }

    const { x, y, text } = geometry as TextGeometry;
    this.x = x;
    this.y = y;
    this.content = text;

    // Update text content and position
    this.text.textContent = text;
    this.text.setAttribute('x', x.toString());
    this.text.setAttribute('y', y.toString());
  }

  override getGeometry(): Geometry {
    return {
      type: 'text',
      x: this.x,
      y: this.y,
      text: this.content,
    };
  }

  override applyStyle(style: ShapeStyle): void {
    // Call parent to handle common styling
    super.applyStyle(style);

    // Apply text-specific styles through the unified StyleManager approach
    if (this.text) {
      // Use stroke for text color to maintain consistency
      this.text.style.fill = style.stroke;
      
      // Apply text-specific properties
      if (style.fontFamily) {
        this.text.style.fontFamily = style.fontFamily;
      }
      if (style.fontSize) {
        this.text.style.fontSize = `${style.fontSize}px`;
      }
      if (style.fontWeight) {
        this.text.style.fontWeight = style.fontWeight;
      }
      if (style.fontStyle) {
        this.text.style.fontStyle = style.fontStyle;
      }
      if (style.textDecoration) {
        this.text.style.textDecoration = style.textDecoration;
      }
    }
  }

  override getBBox(): { x: number; y: number; width: number; height: number } {
    try {
      const bbox = this.text.getBBox();
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      };
    } catch (error) {
      // Fallback estimation
      const fontSize = this.getCurrentStyle()?.fontSize || 14;
      const estimatedWidth = this.content.length * fontSize * 0.6;
      const estimatedHeight = fontSize * 1.2;
      
      return {
        x: this.x - estimatedWidth / 2,
        y: this.y - estimatedHeight / 2,
        width: estimatedWidth,
        height: estimatedHeight
      };
    }
  }

  override moveBy(deltaX: number, deltaY: number): void {
    this.x += deltaX;
    this.y += deltaY;
    this.update({
      type: 'text',
      x: this.x,
      y: this.y,
      text: this.content,
    });
  }

  override containsPoint(point: { x: number; y: number }): boolean {
    const bbox = this.getBBox();
    const tolerance = 5;
    
    return point.x >= bbox.x - tolerance &&
           point.x <= bbox.x + bbox.width + tolerance &&
           point.y >= bbox.y - tolerance &&
           point.y <= bbox.y + bbox.height + tolerance;
  }

  updateTextContent(newText: string): void {
    this.content = newText;
    this.update({
      type: 'text',
      x: this.x,
      y: this.y,
      text: newText,
    });
  }

  // Text shapes don't typically have resize handles
  override getEditHandles(): { x: number; y: number; type: string }[] {
    return [];
  }

}
