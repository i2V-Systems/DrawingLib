import { EventEmitter } from '../../core/events/EventEmitter';
import { ShapeStyle } from '../../core/style/StyleManager';
import { Geometry, Point } from '../../types/shape.types';
import { SVGUtils } from '../../utils/SVGUtils';
import { Shape } from './Shape';

interface ShapeEvents {
  select: { id: string };
  deselect: { id: string };
  hover: { id: string };
  unhover: { id: string };
  geometryChanged: { geometry: Geometry };
}

export abstract class BaseShape extends EventEmitter<ShapeEvents> implements Shape {
  protected readonly id: string;
  protected readonly element: SVGGraphicsElement;
  protected selected: boolean;
  protected hovered: boolean;

  constructor(id: string, element: SVGGraphicsElement) {
    super();
    this.id = id;
    this.element = element;
    this.selected = false;
    this.hovered = false;

    // Set default styles
    this.setDefaultStyles();
  }

  /**
   * Get the shape's ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get the shape's SVG element
   */
  getElement(): SVGGraphicsElement {
    return this.element;
  }

  /**
   * Get the shape's geometry
   */
  abstract getGeometry(): Geometry;

  /**
   * Update the shape's geometry
   */
  abstract update(geometry: Geometry): void;

  /**
   * Set selected state
   */
  setSelected(selected: boolean): void {
    if (this.selected !== selected) {
      this.selected = selected;
      this.element.classList.toggle('selected', selected);
      this.emit(selected ? 'select' : 'deselect', { id: this.id });
    }
  }

  /**
   * Set hovered state
   */
  setHovered(hovered: boolean): void {
    if (this.hovered !== hovered) {
      this.hovered = hovered;
      this.element.classList.toggle('hovered', hovered);
      this.emit(hovered ? 'hover' : 'unhover', { id: this.id });
    }
  }

  /**
   * Check if point is inside shape
   */
  containsPoint(point: Point): boolean {
    const bbox = this.getBBox();
    return point.x >= bbox.x && 
           point.x <= bbox.x + bbox.width && 
           point.y >= bbox.y && 
           point.y <= bbox.y + bbox.height;
  }

  /**
   * Destroy the shape
   */
  destroy(): void {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.removeAllListeners();
  }

  /**
   * Set default styles for the shape
   */
  protected setDefaultStyles(): void {
    this.element.setAttribute('fill', 'none');
    this.element.setAttribute('stroke', '#000');
    this.element.setAttribute('stroke-width', '2');
    this.element.classList.add('annotation-shape');
  }

  /**
   * Get the shape's center point
   */
  getCenter(): { x: number; y: number } {
    return SVGUtils.getCenter(this.element);
  }

  /**
   * Get the shape's bounding box
   */
  getBBox(): { x: number; y: number; width: number; height: number } {
    return this.element.getBBox();
  }

  /**
   * Set the shape's visibility
   */
  setVisible(visible: boolean): void {
    this.element.style.display = visible ? '' : 'none';
  }

  /**
   * Set the shape's opacity
   */
  setOpacity(opacity: number): void {
    this.element.style.opacity = opacity.toString();
  }

  /**
   * Set the shape's stroke color
   */
  setStroke(color: string): void {
    this.element.setAttribute('stroke', color);
  }

  /**
   * Set the shape's stroke width
   */
  setStrokeWidth(width: number): void {
    this.element.setAttribute('stroke-width', width.toString());
  }

  /**
   * Set the shape's fill color
   */
  setFill(color: string): void {
    this.element.setAttribute('fill', color);
  }

  /**
   * Apply style to the shape
   */
  applyStyle(style: ShapeStyle): void {
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
   * Enable editing mode for the shape
   */
  enableEditing(): void {
    this.element.classList.add('editing');
    this.showEditHandles();
  }

  /**
   * Disable editing mode for the shape
   */
  disableEditing(): void {
    this.element.classList.remove('editing');
    this.hideEditHandles();
  }

  /**
   * Show edit handles (resize, move, etc.)
   */
  protected showEditHandles(): void {
    // Override in subclasses to show specific handles
  }

  /**
   * Hide edit handles
   */
  protected hideEditHandles(): void {
    // Override in subclasses to hide specific handles
  }

  /**
   * Check if shape is in editing mode
   */
  isEditing(): boolean {
    return this.element.classList.contains('editing');
  }

  /**
   * Move the shape by delta
   */
  moveBy(deltaX: number, deltaY: number): void {
    // Override in subclasses to implement specific move logic
  }

  /**
   * Resize the shape
   */
  resize(newWidth: number, newHeight: number): void {
    // Override in subclasses to implement specific resize logic
  }

  /**
   * Get edit handles for the shape
   */
  getEditHandles(): { x: number; y: number; type: string }[] {
    // Override in subclasses to return specific handles
    return [];
  }
}
