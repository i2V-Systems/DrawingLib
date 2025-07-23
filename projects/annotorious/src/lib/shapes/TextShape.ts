import { BaseShape } from './base/BaseShape';
import { Geometry, TextGeometry } from '../types/shape.types';

export class TextShape extends BaseShape {
  private text: SVGTextElement;
  private group: SVGGElement;
  private x: number = 0;
  private y: number = 0;
  private content: string = '';

  constructor(id: string, geometry: Geometry) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    group.appendChild(text); // Only append text, no background
    group.classList.add('annotation-shape');

    super(id, group);
    this.group = group;
    this.text = text;
    // Remove: this.background = background;

    // Set default text styles
    this.text.setAttribute('dominant-baseline', 'middle');
    this.text.setAttribute('text-anchor', 'middle');

    this.update(geometry);
  }


  update(geometry: Geometry): void {
    if (geometry.type !== 'text') {
      throw new Error('Invalid geometry type');
    }

    const { x, y, text, style } = geometry as TextGeometry;

    this.x = x;
    this.y = y;
    this.content = text;

    // Update text content
    this.text.textContent = text;

    // Set default text styles
    this.text.setAttribute('font-family', 'Arial');
    this.text.setAttribute('font-size', '12px');
    this.text.setAttribute('font-weight', 'normal');
    this.text.setAttribute('font-style', 'normal');
    this.text.setAttribute('text-decoration', 'none');
    this.text.setAttribute('fill', 'black'); // Direct fill for text

    // Apply custom styles if provided
    if (geometry.style) {
      if (geometry.style.fontFamily) this.text.style.fontFamily = geometry.style.fontFamily;
      if (geometry.style.fontSize) this.text.style.fontSize = `${geometry.style.fontSize}px`;
      if (geometry.style.fontWeight) this.text.style.fontWeight = geometry.style.fontWeight;
      if (geometry.style.fontStyle) this.text.style.fontStyle = geometry.style.fontStyle;
      if (geometry.style.fill) this.text.setAttribute('fill', geometry.style.fill);
    }

    // For text without background, you might want to position it directly
    // rather than calculating a bounding rectangle
    this.text.setAttribute('x', x.toString());
    this.text.setAttribute('y', (y + (style?.fontSize || 20) / 2).toString()); // Center vertically

  }

  /**
   * Get accurate text bounding box dimensions
   */
  private getTextBoundingBox(): { width: number; height: number } {
    try {
      // Temporarily position text for accurate measurement
      this.text.setAttribute('x', '0');
      this.text.setAttribute('y', '0');

      const bbox = this.text.getBBox();

      return {
        width: bbox.width || this.estimateTextWidth(),
        height: bbox.height || this.estimateTextHeight()
      };
    } catch (error) {
      // Fallback to estimation if getBBox fails
      return {
        width: this.estimateTextWidth(),
        height: this.estimateTextHeight()
      };
    }
  }

  /**
   * Fallback text width estimation
   */
  private estimateTextWidth(): number {
    const fontSize = parseFloat(this.text.style.fontSize || '14');
    const charWidth = fontSize * 0.6; // Approximate character width
    return this.content.length * charWidth;
  }

  /**
   * Fallback text height estimation
   */
  private estimateTextHeight(): number {
    const fontSize = parseFloat(this.text.style.fontSize || '14');
    const lineHeight = fontSize * 1.2; // Approximate line height
    const lines = this.content.split('\n').length;
    return lines * lineHeight;
  }

  override getBBox(): { x: number; y: number; width: number; height: number } {
    try {
      // Try to get actual text bounding box
      const textBBox = this.text.getBBox();
      return {
        x: textBBox.x,
        y: textBBox.y,
        width: textBBox.width,
        height: textBBox.height
      };
    } catch (error) {
      // Fallback to estimated dimensions
      return {
        x: this.x,
        y: this.y - this.estimateTextHeight() / 2, // Adjust for middle baseline
        width: this.estimateTextWidth(),
        height: this.estimateTextHeight()
      };
    }
  }

  override getGeometry(): Geometry {
    return {
      type: 'text',
      x: this.x,
      y: this.y,
      text: this.content,
    };
  }


  public override moveBy(deltaX: number, deltaY: number): void {
    this.x += deltaX;
    this.y += deltaY;
    this.update({
      type: 'text',
      x: this.x,
      y: this.y,
      text: this.content,

    });
  }


  public override containsPoint(point: { x: number; y: number }): boolean {
    const bbox = this.getBBox();
    const tol = 5;

    // Check if point is within text bounding box with tolerance
    return point.x >= bbox.x - tol &&
      point.x <= bbox.x + bbox.width + tol &&
      point.y >= bbox.y - tol &&
      point.y <= bbox.y + bbox.height + tol;
  }

  /**
   * Method to update text content and auto-resize
   */
  public updateTextContent(newText: string): void {
    this.content = newText;
    this.update({
      type: 'text',
      x: this.x,
      y: this.y,
      text: newText,
    });
  }
}
