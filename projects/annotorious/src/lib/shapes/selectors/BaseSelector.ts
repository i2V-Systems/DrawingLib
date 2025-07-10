import { EventEmitter } from '../../core/events/EventEmitter';
import { Geometry } from '../types';
import { SVGUtils } from '../../utils/SVGUtils';
import { ShapeStyle } from '../../core/style/StyleManager';

interface SelectorEvents {
  complete: { geometry: Geometry };
  cancel: void;
}

export abstract class BaseSelector extends EventEmitter<SelectorEvents> {
  protected readonly svg: SVGSVGElement;
  protected readonly element: SVGGraphicsElement;
  protected active: boolean;
  protected style: ShapeStyle | null;

  constructor(svg: SVGSVGElement) {
    super();
    this.svg = svg;
    this.element = SVGUtils.createElement('g') as SVGGraphicsElement;
    this.active = false;
    this.style = null;

    // Add selector class
    this.element.classList.add('annotorious-selector');
  }

  /**
   * Start the selection process
   */
  start(): void {
    if (!this.active) {
      this.active = true;
      this.svg.appendChild(this.element);
      this.attachEventListeners();
    }
  }

  /**
   * Stop the selection process
   */
  stop(): void {
    if (this.active) {
      this.active = false;
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      this.detachEventListeners();
    }
  }

  /**
   * Check if the selector is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get the current geometry
   */
  abstract getGeometry(): Geometry | null;

  /**
   * Set the style for the selector
   */
  setStyle(style: ShapeStyle): void {
    this.style = style;
    if (this.element) {
      this.element.style.fill = style.fill;
      this.element.style.fillOpacity = style.fillOpacity.toString();
      this.element.style.stroke = style.stroke;
      this.element.style.strokeWidth = style.strokeWidth.toString();
      this.element.style.strokeOpacity = style.strokeOpacity.toString();
      if (style.strokeDasharray) {
        this.element.style.strokeDasharray = style.strokeDasharray;
      }
    }
  }

  /**
   * Get the current style
   */
  getStyle(): ShapeStyle | null {
    return this.style;
  }

  /**
   * Attach event listeners
   */
  protected abstract attachEventListeners(): void;

  /**
   * Detach event listeners
   */
  protected abstract detachEventListeners(): void;

  /**
   * Get mouse position relative to SVG
   */
  protected getMousePosition(evt: MouseEvent): { x: number; y: number } {
    return SVGUtils.getMousePosition(evt, this.svg);
  }

  /**
   * Set selector styles
   */
  protected setStyles(styles: { [key: string]: string }): void {
    Object.entries(styles).forEach(([key, value]) => {
      this.element.style.setProperty(key, value);
    });
  }

  /**
   * Complete the selection
   */
  protected complete(): void {
    const geometry = this.getGeometry();
    if (geometry) {
      this.emit('complete', { geometry });
    }
    this.stop();
  }

  /**
   * Cancel the selection
   */
  protected cancel(): void {
    this.emit('cancel', undefined);
    this.stop();
  }
}
