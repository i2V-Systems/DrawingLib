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
  private draggingHandle: SVGElement | null = null;
  private editingId: string | null = null;
  private handleListeners: WeakMap<SVGElement, (e: PointerEvent) => void> = new WeakMap();

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
    shape.enableEditing();
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
    this.draggingHandle = null;
  }

  private onHandlePointerDown(event: PointerEvent, handleElement: SVGElement): void {
    event.stopPropagation();
    this.draggingHandle = handleElement;
    this.emit('editingDragStarted', {});
  }

  private onPointerMove = (event: PointerEvent) => {
    if (!this.editingShape || !this.draggingHandle) return;
    const pt = this.getSVGPoint(event);
    // Clamp to SVG bounds
    const clamped = this.clampToSVG(pt);
    (this.editingShape as any).updateFromHandle(this.draggingHandle, clamped);
  };

  private onPointerUp = (_event: PointerEvent) => {
    this.draggingHandle = null;
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
} 