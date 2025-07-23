import { Shape } from '../../shapes/base';
import { Point, Geometry } from '../../types/shape.types';
import { EventEmitter } from '../events/EventEmitter';

export interface EditHandle {
  element: SVGElement;
  position: Point;
  onDrag: (newPos: Point) => void;
}

/**
 * Minimal EditManager: attaches/removes handles for a shape and manages drag events.
 */
export class EditManager extends EventEmitter {
  private svg: SVGSVGElement;
  private editingShape: Shape | null = null;
  private editingId: string | null = null;
  private handleListeners: WeakMap<SVGElement, (e: PointerEvent) => void> = new WeakMap();

  // Configurable selector for the main shape element
  private shapeElementSelector: string = '.annotation-shape';

  // Unified drag context
  private dragContext: {
    type: 'handle' | 'shape' | null;
    element?: SVGElement;
    lastPointerPos?: Point;
  } = { type: null };

  // Store listeners for cleanup
  private listeners: { [key: string]: (e: PointerEvent) => void } = {};

  constructor(svg: SVGSVGElement) {
    super();
    this.svg = svg;
  }

  startEditing(id: string, shape: Shape): void {
    this.stopEditing(); // Clean up any previous editing
    this.editingShape = shape;
    this.editingId = id;
    this.svg.addEventListener('pointermove', this.onPointerMove);
    this.svg.addEventListener('pointerup', this.onPointerUp);
    this.shapeElementSelector = this.getShapeElementSelector(shape);
    shape.enableEditing();

    // Add pointerdown to main shape element for dragging
    const shapeElement = shape.getElement().querySelector(this.shapeElementSelector) as SVGElement;
    if (shapeElement) {
      this.listeners['shapePointerDown'] = (e: PointerEvent) => this.onShapePointerDown(e, shapeElement);
      shapeElement.addEventListener('pointerdown', this.listeners['shapePointerDown']);
    }

    shape.getEditHandles().forEach(handle => {
      const el = (handle as any).element;
      const handler = (e: PointerEvent) => this.onHandlePointerDown(e, el);
      this.handleListeners.set(el, handler);
      el.addEventListener('pointerdown', handler);
    });
  }

  stopEditing(): void {
    if (this.editingShape && this.editingId) {
      // Emit updateGeometry event with the latest geometry
      const geometry = this.editingShape.getGeometry();
      this.emit('updateGeometry', { id: this.editingId, geometry });
    }
    if (this.editingShape) {
      // Remove shape pointerdown handler
      const shapeElement = this.editingShape.getElement().querySelector(this.shapeElementSelector) as SVGElement;
      if (shapeElement && this.listeners['shapePointerDown']) {
        shapeElement.removeEventListener('pointerdown', this.listeners['shapePointerDown']);
        delete this.listeners['shapePointerDown'];
      }
      this.editingShape.getEditHandles().forEach(handle => {
        const el = (handle as any).element;
        const handler = this.handleListeners.get(el);
        if (handler) {
          el.removeEventListener('pointerdown', handler);
          this.handleListeners.delete(el);
        }
      });
      this.editingShape.disableEditing();
      this.editingShape = null;
    }
    this.editingId = null;
    this.svg.removeEventListener('pointermove', this.onPointerMove);
    this.svg.removeEventListener('pointerup', this.onPointerUp);
    this.dragContext = { type: null };
  }

  private onHandlePointerDown(event: PointerEvent, handleElement: SVGElement): void {
    event.stopPropagation();
    this.dragContext = {
      type: 'handle',
      element: handleElement,
      lastPointerPos: this.getSVGPoint(event)
    };
    this.emit('editingDragStarted', {});
  }

  private onShapePointerDown(event: PointerEvent, shapeElement: SVGElement): void {
    event.stopPropagation();
    this.dragContext = {
      type: 'shape',
      element: shapeElement,
      lastPointerPos: this.getSVGPoint(event)
    };
    this.emit('editingDragStarted', {});
  }

  private onPointerMove = (event: PointerEvent) => {
    if (!this.editingShape || !this.dragContext.type) return;
    const pt = this.getSVGPoint(event);
    if (this.dragContext.type === 'shape' && this.dragContext.lastPointerPos) {
      const dx = pt.x - this.dragContext.lastPointerPos.x;
      const dy = pt.y - this.dragContext.lastPointerPos.y;
      (this.editingShape as any).moveBy(dx, dy);
      this.dragContext.lastPointerPos = pt;
      return;
    }
    if (this.dragContext.type === 'handle' && this.dragContext.element) {
      // Clamp to SVG bounds
      const clamped = this.clampToSVG(pt);
      (this.editingShape as any).updateFromHandle(this.dragContext.element, clamped);
    }
  };

  private onPointerUp = (_event: PointerEvent) => {
    this.dragContext = { type: null };
    this.emit('editingDragStopped', {});
  };

  private getSVGPoint(event: PointerEvent): Point {
    const svg = this.svg;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    }
    return { x: pt.x, y: pt.y };
  }

  /**
   * Clamp a point to the SVG's bounding box
   */
  private clampToSVG(point: Point): Point {
    const rect = this.svg.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(point.x, rect.width)),
      y: Math.max(0, Math.min(point.y, rect.height))
    };
  }

  private getShapeElementSelector(shape: Shape): string {
    const geometry = shape.getGeometry();
    if (geometry.type === 'text') {
      return 'text'; // Target the text element directly, not .annotation-shape
    }
    return '.annotation-shape';
  }
} 