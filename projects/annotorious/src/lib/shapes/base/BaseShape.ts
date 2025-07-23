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
   * @param selected - whether the shape is selected
   * @param styleManager - (optional) StyleManager instance for dynamic styling
   * @param id - (optional) shape id for style lookup
   */
  setSelected(selected: boolean, styleManager?: any, id?: string): void {
    if (this.selected !== selected) {
      this.selected = selected;
      if (styleManager && id) {
        const style = selected
          ? styleManager.applySelectionStyle(id)
          : styleManager.getStyle(id);
        this.applyStyle(style);
      } else {
        // fallback to hardcoded values
        this.shapeElement.style.strokeWidth = selected ? '3' : '2';
      }
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
    this.shapeElement.classList.add('editing');
    this.showEditHandles();
    this.handles.forEach(handle => {
      handle.classList.add('editing');
    });
  }

  /**
   * Disable editing mode for the shape
   */
  disableEditing(): void {
    this.shapeElement.classList.remove('editing');
    this.handles.forEach(handle => {
      handle.classList.remove('editing');
    });
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
    return this.shapeElement.classList.contains('editing');
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



  /**
   * Determines if a point is on the circumference/edge of the shape.
   * Subclasses can override for custom hit detection.
   */
  protected isOnCircumference(point: { x: number; y: number }): boolean {
    // Default: use containsPoint (with tolerance for edge)
    return this.containsPoint(point);
  }
}

