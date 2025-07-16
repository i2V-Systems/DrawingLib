import { EventEmitter } from '../events/EventEmitter';
import { Shape } from '../../shapes/base';
import { Annotation } from '../../types/annotation.types';
import { Point } from '../../types/shape.types';
import { EditableShape } from '../../shapes/editable/EditableShape';
import { EditableCircle } from '../../shapes/editable/EditableCircle';
import { EditableRectangle } from '../../shapes/editable/EditableRectangle';
import { EditableEllipse } from '../../shapes/editable/EditableEllipse';
import { EditablePolygon } from '../../shapes/editable/EditablePolygon';

export interface EditHandle {
  element: SVGElement;
  position: Point;
  onDrag: (newPos: Point) => void;
}

export interface EditState {
  id: string;
  shape: Shape;
  editableShape: EditableShape;
  handles: EditHandle[];
  isDragging: boolean;
  dragStartPoint: Point | null;
  dragStartGeometry: any;
  selectedHandle: EditHandle | null;
  shapeMouseDownListener: ((e: MouseEvent) => void) | null;
}

export interface EditManagerEvents {
  editingStarted: { id: string; shape: Shape };
  editingStopped: { id: string };
  handleDragged: { id: string; handleIndex: number; position: Point };
}

/**
 * Manages editing operations for annotations using EditableShape classes
 */
export class EditManager extends EventEmitter<EditManagerEvents> {
  private svg: SVGSVGElement;
  private editStates: Map<string, EditState> = new Map();
  private currentEditId: string | null = null;

  constructor(svg: SVGSVGElement) {
    super();
    this.svg = svg;
  }

  /**
   * Start editing an annotation
   */
  startEditing(annotationId: string, shape: Shape): void {
    if (this.currentEditId) {
      this.stopEditing(this.currentEditId);
    }

    // Instantiate the correct EditableShape
    let editableShape: EditableShape;
    const geometry = shape.getGeometry();
    switch (geometry.type) {
      case 'circle':
        editableShape = new EditableCircle(shape);
        break;
      case 'rectangle':
        editableShape = new EditableRectangle(shape);
        break;
      case 'ellipse':
        editableShape = new EditableEllipse(shape);
        break;
      case 'polygon':
        editableShape = new EditablePolygon(shape);
        break;
      default:
        throw new Error('Unsupported shape type');
    }

    // Add handles to SVG
    editableShape.getHandles().forEach(handle => {
      this.svg.appendChild(handle.element);
      handle.element.addEventListener('mousedown', (e: MouseEvent) => this.onHandleMouseDown(e, annotationId, handle));
    });

    const editState: EditState = {
      id: annotationId,
      shape,
      editableShape,
      handles: editableShape.handles,
      isDragging: false,
      dragStartPoint: null,
      dragStartGeometry: null,
      selectedHandle: null,
      shapeMouseDownListener: null
    };

    this.editStates.set(annotationId, editState);
    this.currentEditId = annotationId;

    // Add editing class to shape
    shape.getElement().classList.add('editing');

    // Setup shape drag event
    editState.shapeMouseDownListener = (e: MouseEvent) => this.onShapeMouseDown(e, annotationId);
    shape.getElement().addEventListener('mousedown', editState.shapeMouseDownListener);

    this.emit('editingStarted', { id: annotationId, shape });
  }

  /**
   * Stop editing an annotation
   */
  stopEditing(annotationId: string): void {
    const editState = this.editStates.get(annotationId);
    if (!editState) return;

    // Remove handles from SVG
    editState.handles.forEach(handle => {
      if (handle.element.parentNode) {
        handle.element.parentNode.removeChild(handle.element);
      }
    });

    // Remove shape event listener
    if (editState.shapeMouseDownListener) {
      editState.shape.getElement().removeEventListener('mousedown', editState.shapeMouseDownListener);
    }

    // Remove editing class
    editState.shape.getElement().classList.remove('editing');

    // Destroy editable shape if needed
    if (editState.editableShape.destroy) {
      editState.editableShape.destroy();
    }

    this.editStates.delete(annotationId);
    if (this.currentEditId === annotationId) {
      this.currentEditId = null;
    }
    this.emit('editingStopped', { id: annotationId });
  }

  stopAllEditing(): void {
    Array.from(this.editStates.keys()).forEach(id => this.stopEditing(id));
  }

  isEditing(annotationId?: string): boolean {
    if (annotationId) {
      return this.editStates.has(annotationId);
    }
    return this.currentEditId !== null;
  }

  getCurrentEditState(): EditState | null {
    return this.currentEditId ? this.editStates.get(this.currentEditId) || null : null;
  }

  // --- Handle Events ---

  private onHandleMouseDown(event: MouseEvent, annotationId: string, handle: EditHandle): void {
    event.stopPropagation();
    const editState = this.editStates.get(annotationId);
    if (!editState) return;
    editState.selectedHandle = handle;
    editState.isDragging = true;
    editState.dragStartPoint = this.getSVGPoint(event);
    this.svg.addEventListener('mousemove', this.onGlobalMouseMove);
    this.svg.addEventListener('mouseup', this.onGlobalMouseUp);
  }

  private onShapeMouseDown(event: MouseEvent, annotationId: string): void {
    event.stopPropagation();
    const editState = this.editStates.get(annotationId);
    if (!editState) return;
    editState.isDragging = true;
    editState.dragStartPoint = this.getSVGPoint(event);
    this.svg.addEventListener('mousemove', this.onGlobalMouseMove);
    this.svg.addEventListener('mouseup', this.onGlobalMouseUp);
  }


  private onGlobalMouseMove = (event: MouseEvent) => {
    if (!this.currentEditId) return;
    const editState = this.editStates.get(this.currentEditId);
    if (!editState || !editState.isDragging) return;
    let currentPoint = this.getSVGPoint(event);
    currentPoint = this.clampToSVG(currentPoint);
    if (editState.selectedHandle) {
      // Delegate to EditableShape
      editState.editableShape.updateFromHandle(editState.selectedHandle, currentPoint);
      this.emit('handleDragged', {
        id: editState.id,
        handleIndex: editState.handles.indexOf(editState.selectedHandle),
        position: currentPoint
      });
    } else {
      // Dragging the whole shape (move)
      const start = editState.dragStartPoint;
      if (!start) return;
      const dx = currentPoint.x - start.x;
      const dy = currentPoint.y - start.y;
      editState.shape.moveBy(dx, dy);
      editState.editableShape.updateHandlePositions();
      editState.dragStartPoint = currentPoint;
    }
  };

  private onGlobalMouseUp = (_event: MouseEvent) => {
    if (!this.currentEditId) return;
    const editState = this.editStates.get(this.currentEditId);
    if (!editState) return;
    editState.isDragging = false;
    editState.selectedHandle = null;
    this.svg.removeEventListener('mousemove', this.onGlobalMouseMove);
    this.svg.removeEventListener('mouseup', this.onGlobalMouseUp);
  };

  private getSVGPoint(event: MouseEvent): Point {
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

  destroy(): void {
    this.stopAllEditing();
  }
} 