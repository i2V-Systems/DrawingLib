import { EventEmitter } from '../../core/events/EventEmitter';
import { ShapeStyle } from '../../core/managers/StyleManager';
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
  protected readonly rootGroup: SVGGElement;
  protected readonly shapeElement: SVGGraphicsElement;
  protected selected: boolean;
  protected hovered: boolean;
  protected handles: SVGCircleElement[] = [];
  protected handlesGroup: SVGGElement;

  constructor(id: string, shapeElement: SVGGraphicsElement) {
    super();
    this.id = id;
    this.shapeElement = shapeElement;
    this.rootGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.rootGroup.setAttribute('class', 'a9s-shape-group');
    this.selected = false;
    this.hovered = false;

    // Set default styles
    this.setDefaultStyles();

    // Create a group for handles and append to the root group
    this.handlesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.handlesGroup.setAttribute('class', 'a9s-handles-group');
    this.handlesGroup.style.display = 'none';
    this.rootGroup.appendChild(this.shapeElement);
    this.rootGroup.appendChild(this.handlesGroup);
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
  getElement(): SVGGElement {
    return this.rootGroup;
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
      this.shapeElement.classList.toggle('selected', selected);
      this.emit(selected ? 'select' : 'deselect', { id: this.id });
    }
  }

  /**
   * Set hovered state
   */
  setHovered(hovered: boolean): void {
    if (this.hovered !== hovered) {
      this.hovered = hovered;
      this.shapeElement.classList.toggle('hovered', hovered);
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
    if (this.rootGroup.parentNode) {
      this.rootGroup.parentNode.removeChild(this.rootGroup);
    }
    this.removeAllListeners();
  }

  /**
   * Set default styles for the shape
   */
  protected setDefaultStyles(): void {
    this.shapeElement.setAttribute('fill', 'none');
    this.shapeElement.setAttribute('stroke', '#000');
    this.shapeElement.setAttribute('stroke-width', '2');
    this.shapeElement.classList.add('annotation-shape');
  }

  /**
   * Get the shape's center point
   */
  getCenter(): { x: number; y: number } {
    return SVGUtils.getCenter(this.shapeElement);
  }

  /**
   * Get the shape's bounding box
   */
  getBBox(): { x: number; y: number; width: number; height: number } {
    return this.shapeElement.getBBox();
  }

  /**
   * Set the shape's visibility
   */
  setVisible(visible: boolean): void {
    this.rootGroup.style.display = visible ? '' : 'none';
  }

  /**
   * Set the shape's opacity
   */
  setOpacity(opacity: number): void {
    this.shapeElement.style.opacity = opacity.toString();
  }

  /**
   * Set the shape's stroke color
   */
  setStroke(color: string): void {
    this.shapeElement.setAttribute('stroke', color);
  }

  /**
   * Set the shape's stroke width
   */
  setStrokeWidth(width: number): void {
    this.shapeElement.setAttribute('stroke-width', width.toString());
  }

  /**
   * Set the shape's fill color
   */
  setFill(color: string): void {
    this.shapeElement.setAttribute('fill', color);
  }

  /**
   * Apply style to the shape
   */
  applyStyle(style: ShapeStyle): void {
    if (this.shapeElement) {
      this.shapeElement.style.fill = style.fill;
      this.shapeElement.style.fillOpacity = style.fillOpacity.toString();
      this.shapeElement.style.stroke = style.stroke;
      this.shapeElement.style.strokeWidth = style.strokeWidth.toString();
      this.shapeElement.style.strokeOpacity = style.strokeOpacity.toString();
      if (style.strokeDasharray) {
        this.shapeElement.style.strokeDasharray = style.strokeDasharray;
      }
    }
  }

  /**
   * Enable editing mode for the shape
   */
  enableEditing(): void {
    this.rootGroup.classList.add('editing');
    this.showEditHandles();
  }

  /**
   * Disable editing mode for the shape
   */
  disableEditing(): void {
    this.rootGroup.classList.remove('editing');
    this.hideEditHandles();
  }

  /**
   * Show edit handles (resize, move, etc.)
   */
  protected showEditHandles(): void {
    this.handlesGroup.style.display = '';
  }

  /**
   * Hide edit handles
   */
  protected hideEditHandles(): void {
    this.handlesGroup.style.display = 'none';
  }

  /**
   * Check if shape is in editing mode
   */
  isEditing(): boolean {
    return this.rootGroup.classList.contains('editing');
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
