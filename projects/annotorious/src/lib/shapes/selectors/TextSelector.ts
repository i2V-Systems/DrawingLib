import { BaseSelector } from './BaseSelector';
import { Geometry, TextGeometry, Point } from '../types';
import { SVGUtils } from '../../utils/SVGUtils';

export class TextSelector extends BaseSelector {
  private rect: SVGRectElement;
  private text: SVGTextElement;
  private startPoint: { x: number; y: number } | null = null;
  private textContent: string = '';

  constructor(svg: SVGSVGElement) {
    super(svg);
    this.rect = SVGUtils.createElement('rect') as SVGRectElement;
    this.text = SVGUtils.createElement('text') as SVGTextElement;
    this.element.appendChild(this.rect);
    this.element.appendChild(this.text);
    this.setStyles({
      'fill': 'none',
      'stroke': '#000',
      'stroke-width': '2px',
      'stroke-dasharray': '4'
    });
    this.text.setAttribute('dominant-baseline', 'hanging');
    this.text.style.userSelect = 'none';
  }

  // No-op: no direct event listeners
  protected attachEventListeners(): void {}
  protected detachEventListeners(): void {}

  getGeometry(): Geometry | null {
    const width = parseFloat(this.rect.getAttribute('width') || '0');
    const height = parseFloat(this.rect.getAttribute('height') || '0');
    if (width === 0 || height === 0 || !this.textContent) return null;
    return {
      type: 'text',
      x: parseFloat(this.rect.getAttribute('x') || '0'),
      y: parseFloat(this.rect.getAttribute('y') || '0'),
      width,
      height,
      text: this.textContent
    } as TextGeometry;
  }

  handleMouseDown(point: Point, event: MouseEvent): void {
    if (event.button === 0) {
      this.startPoint = point;
      this.rect.setAttribute('x', point.x.toString());
      this.rect.setAttribute('y', point.y.toString());
      this.rect.setAttribute('width', '0');
      this.rect.setAttribute('height', '0');
      this.text.setAttribute('x', point.x.toString());
      this.text.setAttribute('y', point.y.toString());
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
      this.text.setAttribute('x', x.toString());
      this.text.setAttribute('y', y.toString());
    }
  }

  async handleMouseUp(point: Point, event: MouseEvent): Promise<void> {
    if (event.button === 0 && this.startPoint) {
      const text = await this.promptForText();
      if (text) {
        this.textContent = text;
        this.text.textContent = text;
        const geometry = this.getGeometry();
        if (geometry) {
          this.complete();
        } else {
          this.cancel();
        }
      } else {
        this.cancel();
      }
      this.startPoint = null;
    }
  }

  private async promptForText(): Promise<string | null> {
    const text = window.prompt('Enter text annotation:');
    return text || null;
  }

  setTextStyle(style: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    fill?: string;
  }): void {
    if (style.fontFamily) this.text.style.fontFamily = style.fontFamily;
    if (style.fontSize) this.text.style.fontSize = `${style.fontSize}px`;
    if (style.fontWeight) this.text.style.fontWeight = style.fontWeight;
    if (style.fontStyle) this.text.style.fontStyle = style.fontStyle;
    if (style.fill) this.text.setAttribute('fill', style.fill);
  }
}
