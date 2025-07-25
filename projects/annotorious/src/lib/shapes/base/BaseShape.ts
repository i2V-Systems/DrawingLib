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
  protected readonly selectionOutline: SVGGraphicsElement;
  protected selected: boolean;
  protected hovered: boolean;
  protected handles: SVGCircleElement[] = [];
  protected handlesGroup: SVGGElement;
  protected currentStyle: ShapeStyle | null = null;

  constructor(id: string, shapeElement: SVGGraphicsElement) {
    super();
    this.id = id;
    this.shapeElement = shapeElement;
    this.rootGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.rootGroup.setAttribute('class', 'a9s-shape-group');
    this.selected = false;
    this.hovered = false;

    // Create a persistent selection outline from a shallow clone
    this.selectionOutline = this.shapeElement.cloneNode(false) as SVGGraphicsElement;
    this.selectionOutline.classList.add('selection-outline');
    this.selectionOutline.style.display = 'none';

    // Create handles group
    this.handlesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.handlesGroup.setAttribute('class', 'a9s-handles-group');
    this.handlesGroup.style.display = 'none';

    // Assemble the structure
    this.rootGroup.appendChild(this.selectionOutline);
    this.rootGroup.appendChild(this.shapeElement);
    this.rootGroup.appendChild(this.handlesGroup);

    // Set initial class
    this.shapeElement.classList.add('annotation-shape');
  }

  getId(): string {
    return this.id;
  }

  getElement(): SVGGElement {
    return this.rootGroup;
  }

  abstract getGeometry(): Geometry;
  abstract update(geometry: Geometry): void;

  setSelected(selected: boolean): void {
    if (this.selected !== selected) {
      this.selected = selected;
      if (selected) {
        this.selectionOutline.style.display = '';
        if (this.currentStyle) {
          this.selectionOutline.style.stroke = this.currentStyle.selectionOutlineColor;
          this.selectionOutline.style.strokeWidth = (this.currentStyle.strokeWidth + 3).toString();
        }
        this.updateOutline();
        this.showEditHandles();
      } else {
        this.selectionOutline.style.display = 'none';
        this.hideEditHandles();
      }
      this.emit(selected ? 'select' : 'deselect', { id: this.id });
    }
  }

  setHovered(hovered: boolean): void {
    if (this.hovered !== hovered) {
      this.hovered = hovered;
      this.shapeElement.classList.toggle('hover', hovered);
      this.emit(hovered ? 'hover' : 'unhover', { id: this.id });
    }
  }

  containsPoint(point: Point): boolean {
    const bbox = this.getBBox();
    return point.x >= bbox.x &&
           point.x <= bbox.x + bbox.width &&
           point.y >= bbox.y &&
           point.y <= bbox.y + bbox.height;
  }

  destroy(): void {
    if (this.rootGroup.parentNode) {
      this.rootGroup.parentNode.removeChild(this.rootGroup);
    }
    this.removeAllListeners();
  }

  getCenter(): { x: number; y: number } {
    return SVGUtils.getCenter(this.shapeElement);
  }

  getBBox(): { x: number; y: number; width: number; height: number } {
    return this.shapeElement.getBBox();
  }

  setVisible(visible: boolean): void {
    this.rootGroup.style.display = visible ? '' : 'none';
  }

  setOpacity(opacity: number): void {
    this.shapeElement.style.opacity = opacity.toString();
  }

  applyStyle(style: ShapeStyle): void {
    this.currentStyle = { ...style };
    
    if (this.shapeElement) {
      // Apply stroke properties
      this.shapeElement.style.stroke = style.stroke;
      this.shapeElement.style.strokeWidth = style.strokeWidth.toString();
      this.shapeElement.style.strokeOpacity = style.strokeOpacity.toString();
      
      // Apply fill properties
      if (style.fill !== undefined) {
        this.shapeElement.style.fill = style.fill;
      }
      if (style.fillOpacity !== undefined) {
        this.shapeElement.style.fillOpacity = style.fillOpacity.toString();
      }
      
      // Apply stroke dash array
      if (style.strokeDasharray) {
        this.shapeElement.style.strokeDasharray = style.strokeDasharray;
      } else {
        this.shapeElement.style.strokeDasharray = '';
      }
    }

    // Apply selection outline styles
    if (this.selectionOutline) {
        this.selectionOutline.style.stroke = style.selectionOutlineColor;
        this.selectionOutline.style.strokeWidth = (style.strokeWidth + 3).toString();
    }

    // Apply handle styles
    this.updateHandleStyles(style);
  }

  updateHandleStyles(style: ShapeStyle): void {
    this.currentStyle = { ...style };
    this.handles.forEach(handle => {
      handle.style.fill = style.handleFill;
      handle.style.stroke = '#000000';
      handle.style.strokeWidth = (style.strokeWidth / 2).toString();
      handle.setAttribute('r', (style.handleSize / 2).toString());
    });
  }

  enableEditing(): void {
    this.shapeElement.classList.add('editing');
    this.showEditHandles();
  }

  disableEditing(): void {
    this.shapeElement.classList.remove('editing');
    this.hideEditHandles();
  }

  protected showEditHandles(): void {
    this.handlesGroup.style.display = '';
  }

  protected hideEditHandles(): void {
    this.handlesGroup.style.display = 'none';
  }

  isEditing(): boolean {
    return this.shapeElement.classList.contains('editing');
  }

  moveBy(deltaX: number, deltaY: number): void {
    // Override in subclasses
  }

  resize(newWidth: number, newHeight: number): void {
    // Override in subclasses
  }

  getEditHandles(): { x: number; y: number; type: string }[] {
    // Override in subclasses
    return [];
  }

  protected isOnCircumference(point: { x: number; y: number }): boolean {
    return this.containsPoint(point);
  }

  getCurrentStyle(): ShapeStyle | null {
    return this.currentStyle ? { ...this.currentStyle } : null;
  }

  updateOutline(): void {
    if (this.selectionOutline) {
      const geometry = this.getGeometry();
      for (const key in geometry) {
        if (key !== 'type') {
          this.selectionOutline.setAttribute(key, geometry[key as keyof Geometry]);
        }
      }
    }
  }
}
