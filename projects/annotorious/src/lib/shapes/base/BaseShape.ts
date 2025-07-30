import { EventEmitter } from '../../core/events/EventEmitter';
import { ShapeStyle } from '../../core/managers/StyleManager';
import { Geometry, Point, TextGeometry } from '../../types/shape.types';
import { SVGUtils } from '../../utils/SVGUtils';
import { Shape } from './Shape';

interface ShapeEvents {
  select: { id: string };
  deselect: { id: string };
  hover: { id: string };
  unhover: { id: string };
  geometryChanged: { geometry: Geometry };
  labelUpdated: { id: string; label: TextGeometry };
}

export abstract class BaseShape
  extends EventEmitter<ShapeEvents>
  implements Shape
{
  protected readonly id: string;
  protected readonly rootGroup: SVGGElement;
  protected readonly shapeElement: SVGGraphicsElement;
  protected readonly labelElement: SVGTextElement;
  protected readonly labelBbox: SVGRectElement;
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
    this.rootGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    this.rootGroup.setAttribute('class', 'a9s-shape-group');
    this.selected = false;
    this.hovered = false;

    // Create a persistent selection outline from a shallow clone
    this.selectionOutline = this.shapeElement.cloneNode(
      false
    ) as SVGGraphicsElement;
    this.selectionOutline.classList.remove('annotation-shape');
    this.selectionOutline.classList.add('selection-outline');
    this.selectionOutline.style.display = 'none';
    this.selectionOutline.style.fill = 'none';

    // Create handles group
    this.handlesGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    this.handlesGroup.setAttribute('class', 'a9s-handles-group');
    this.handlesGroup.style.display = 'none';

    // Assemble the structure
    this.rootGroup.appendChild(this.selectionOutline);
    this.rootGroup.appendChild(this.shapeElement);

    this.labelElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'text'
    );
    this.labelElement.setAttribute('class', 'annotation-label');
    this.labelElement.setAttribute('text-anchor', 'middle');
    this.rootGroup.appendChild(this.labelElement);

    this.labelBbox = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect'
    );
    this.labelBbox.setAttribute('class', 'a9s-label-bbox');
    this.rootGroup.insertBefore(this.labelBbox, this.labelElement);

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

  // Simplified updateLabel method
  updateLabel(label: TextGeometry): void {
    this.labelElement.style.display = '';
    this.labelBbox.style.display = '';
    this.labelElement.setAttribute('x', label.x.toString());
    this.labelElement.setAttribute('y', label.y.toString());
    this.labelElement.textContent = label.text;

    if (label.style) {
      for (const key in label.style) {
        const value = label.style[key as keyof typeof label.style];
        if (value !== undefined) {
          this.labelElement.style[key as any] = String(value);
        }
      }
    }

    // Update bbox
    setTimeout(() => {
      const padding = 5;
      const bbox = this.labelElement.getBBox();
      this.labelBbox.setAttribute('x', (bbox.x - padding).toString());
      this.labelBbox.setAttribute('y', (bbox.y - padding).toString());
      this.labelBbox.setAttribute(
        'width',
        (bbox.width + 2 * padding).toString()
      );
      this.labelBbox.setAttribute(
        'height',
        (bbox.height + 2 * padding).toString()
      );
    }, 0);
  }

  setSelected(selected: boolean): void {
    if (this.selected !== selected) {
      this.selected = selected;
      if (selected) {
        this.selectionOutline.style.display = '';
        if (this.currentStyle) {
          this.selectionOutline.style.stroke =
            this.currentStyle.selectionOutlineColor;
          this.selectionOutline.style.strokeWidth = (
            this.currentStyle.strokeWidth + 3
          ).toString();
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
    return (
      point.x >= bbox.x &&
      point.x <= bbox.x + bbox.width &&
      point.y >= bbox.y &&
      point.y <= bbox.y + bbox.height
    );
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

    // Apply shape-specific styles
    this.applyShapeStyles(style);

    // Apply selection outline with fixed relationship
    this.applySelectionStyles(style);

    // Apply handle styles with fixed properties
    this.applyHandleStyles(style);

    // Apply label styles with fixed relationships
    this.applyLabelStyles(style);
  }

  private applyShapeStyles(style: ShapeStyle): void {
    if (this.shapeElement) {
      this.shapeElement.style.stroke = style.stroke;
      this.shapeElement.style.strokeWidth = style.strokeWidth.toString();
      this.shapeElement.style.strokeOpacity = style.strokeOpacity.toString();

      if (style.fill !== undefined) {
        this.shapeElement.style.fill = style.fill;
      }

      if (style.fillOpacity !== undefined) {
        this.shapeElement.style.fillOpacity = style.fillOpacity.toString();
      }

      if (style.strokeDasharray) {
        this.shapeElement.style.strokeDasharray = style.strokeDasharray;
      } else {
        this.shapeElement.style.strokeDasharray = '';
      }
    }
  }

  private applySelectionStyles(style: ShapeStyle): void {
    if (this.selectionOutline) {
      // Fixed outline color and computed width relationship
      this.selectionOutline.style.stroke = style.selectionOutlineColor;
      this.selectionOutline.style.strokeWidth =
        style.selectionOutlineWidth.toString();
    }
  }

  private applyHandleStyles(style: ShapeStyle): void {
    this.handles.forEach((handle) => {
      // Fixed handle colors
      handle.style.fill = style.handleFill;
      handle.style.stroke = style.handleStroke;

      // Computed handle size based on strokeWidth and zoom
      handle.setAttribute('r', (style.handleSize / 2).toString());
    });
  }

  private applyLabelStyles(style: ShapeStyle): void {
    if (this.labelElement.textContent) {
      // Fixed label text color
      this.labelElement.style.fill = style.labelTextFill;
      this.labelElement.style.fontSize = `${style.fontSize || 14}px`;
      this.labelElement.style.fontFamily =
        style.fontFamily || 'Arial, sans-serif';
      this.labelElement.style.fontWeight = style.fontWeight || 'normal';
      this.labelElement.style.fontStyle = style.fontStyle || 'normal';

      // Label background fill = shape stroke color
      this.labelBbox.style.fill = style.stroke;
      this.labelBbox.setAttribute('rx', '2');
      this.labelBbox.setAttribute('ry', '2');
    }
  }

  enableEditing(): void {
    this.shapeElement.classList.add('editing');
    this.labelElement.style.cursor = 'move';
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
          this.selectionOutline.setAttribute(
            key,
            geometry[key as keyof Geometry]
          );
        }
      }
    }
  }

  
  /**
   * Set label with automatic positioning
   */
  setLabel(text: string, position?: Point): void {
    let labelPosition = position;
    
    if (!labelPosition) {
      // Auto-calculate position based on shape
      labelPosition = this.getDefaultLabelPosition();
    }

    const labelGeometry: TextGeometry = {
      type: 'text',
      text,
      x: labelPosition.x,
      y: labelPosition.y
    };

    this.updateLabel(labelGeometry);
    this.emit('labelUpdated', { id: this.id, label: labelGeometry });
  }

  /**
   * Get default label position for this shape type
   */
  protected getDefaultLabelPosition(): Point {
    const bbox = this.getBBox();
    return {
      x: bbox.x + bbox.width / 2,
      y: bbox.y - 10
    };
  }

  /**
   * Check if shape has a label
   */
  hasLabel(): boolean {
    return this.labelElement.textContent !== null && this.labelElement.textContent.trim() !== '';
  }

  /**
   * Get current label text
   */
  getLabelText(): string {
    return this.labelElement.textContent || '';
  }

  /**
   * Remove label from shape
   */
  removeLabel(): void {
    this.labelElement.textContent = '';
    this.labelElement.style.display = 'none';
    this.labelBbox.style.display = 'none';
  }
}
