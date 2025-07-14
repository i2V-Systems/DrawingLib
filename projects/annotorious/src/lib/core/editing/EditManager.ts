import { EventEmitter } from '../events/EventEmitter';
import { Shape } from '../../shapes/base';
import { Annotation } from '../../types/annotation.types';
import { Point } from '../../types/shape.types';

interface EditManagerEvents {
  editingStarted: { id: string; shape: Shape };
  editingStopped: { id: string };
  shapeMoved: { id: string; deltaX: number; deltaY: number };
  shapeResized: { id: string; geometry: any };
  handleDragged: { id: string; handleIndex: number; position: Point };
  labelSelected: { id: string; annotationId: string };
}

export interface EditHandle {
  element: SVGElement;
  index: number;
  type: 'vertex' | 'corner' | 'edge' | 'radius';
  position: Point;
}

export interface EditState {
  id: string;
  shape: Shape;
  handles: EditHandle[];
  isDragging: boolean;
  dragStartPoint: Point | null;
  dragStartGeometry: any;
  selectedHandle: EditHandle | null;
  shapeMouseDownListener: ((e: MouseEvent) => void) | null;
}

/**
 * Manages editing operations for annotations
 */
export class EditManager extends EventEmitter<EditManagerEvents> {
  private svg: SVGSVGElement;
  private editStates: Map<string, EditState>;
  private currentEditId: string | null = null;
  private isGlobalDragging = false;
  private globalDragStart: Point | null = null;

  constructor(svg: SVGSVGElement) {
    super();
    this.svg = svg;
    this.editStates = new Map();
    
    // Setup global event listeners
    this.setupGlobalListeners();
  }

  /**
   * Start editing an annotation
   */
  startEditing(annotationId: string, shape: Shape): void {
    // Stop any current editing
    if (this.currentEditId) {
      this.stopEditing(this.currentEditId);
    }

    // Create edit state
    const editState: EditState = {
      id: annotationId,
      shape,
      handles: [],
      isDragging: false,
      dragStartPoint: null,
      dragStartGeometry: null,
      selectedHandle: null,
      shapeMouseDownListener: null
    };

    this.editStates.set(annotationId, editState);
    this.currentEditId = annotationId;

    // Create edit handles
    this.createEditHandles(editState);

    // Add editing class to shape
    shape.getElement().classList.add('editing');

    // Setup shape-specific event listeners for editing
    this.setupShapeEventListeners(editState);

    console.log(`[EditManager] Started editing annotation: ${annotationId}`);
    this.emit('editingStarted', { id: annotationId, shape });
  }

  /**
   * Stop editing an annotation
   */
  stopEditing(annotationId: string): void {
    const editState = this.editStates.get(annotationId);
    if (!editState) return;

    // Remove edit handles
    this.removeEditHandles(editState);

    // Remove shape event listeners
    this.removeShapeEventListeners(editState);

    // Remove editing class from shape
    editState.shape.getElement().classList.remove('editing');

    // Clear state
    this.editStates.delete(annotationId);
    
    if (this.currentEditId === annotationId) {
      this.currentEditId = null;
    }

    console.log(`[EditManager] Stopped editing annotation: ${annotationId}`);
    this.emit('editingStopped', { id: annotationId });
  }

  /**
   * Stop all editing
   */
  stopAllEditing(): void {
    const editIds = Array.from(this.editStates.keys());
    editIds.forEach(id => this.stopEditing(id));
  }

  /**
   * Check if an annotation is being edited
   */
  isEditing(annotationId?: string): boolean {
    if (annotationId) {
      return this.editStates.has(annotationId);
    }
    return this.currentEditId !== null;
  }

  /**
   * Get current edit state
   */
  getCurrentEditState(): EditState | null {
    return this.currentEditId ? this.editStates.get(this.currentEditId) || null : null;
  }

  /**
   * Handle label click - select associated annotation
   */
  handleLabelClick(annotationId: string): void {
    const editState = this.editStates.get(annotationId);
    if (editState) {
      // If already editing, just ensure it's the current one
      if (this.currentEditId !== annotationId) {
        this.stopEditing(this.currentEditId!);
        this.currentEditId = annotationId;
      }
    }
    
    this.emit('labelSelected', { id: annotationId, annotationId });
  }

  /**
   * Create edit handles for a shape
   */
  private createEditHandles(editState: EditState): void {
    const { shape } = editState;
    const geometry = shape.getGeometry();
    const handles: EditHandle[] = [];

    switch (geometry.type) {
      case 'polygon':
        this.createPolygonHandles(editState, geometry.points);
        break;
      case 'rectangle':
        this.createRectangleHandles(editState, geometry);
        break;
      case 'circle':
        this.createCircleHandles(editState, geometry);
        break;
      case 'ellipse':
        this.createEllipseHandles(editState, geometry);
        break;
    }

    editState.handles = handles;
  }

  /**
   * Create handles for polygon vertices
   */
  private createPolygonHandles(editState: EditState, points: Point[]): void {
    const handles: EditHandle[] = [];
    const group = editState.shape.getElement().parentNode as SVGGElement;
    
    points.forEach((point, index) => {
      const handle = this.createHandleElement(point, 'vertex');
      handle.setAttribute('data-index', index.toString());
      
      const editHandle: EditHandle = {
        element: handle,
        index,
        type: 'vertex',
        position: point
      };

      // Add event listeners
      handle.addEventListener('mousedown', (e) => this.onHandleMouseDown(e, editState, editHandle));
      
      group.appendChild(handle);
      handles.push(editHandle);
    });

    editState.handles = handles;
  }

  /**
   * Create handles for rectangle corners
   */
  private createRectangleHandles(editState: EditState, geometry: any): void {
    const { x, y, width, height } = geometry;
    const handles: EditHandle[] = [];
    const group = editState.shape.getElement().parentNode as SVGGElement;
    
    const corners = [
      { x, y }, // top-left
      { x: x + width, y }, // top-right
      { x: x + width, y: y + height }, // bottom-right
      { x, y: y + height } // bottom-left
    ];

    corners.forEach((point, index) => {
      const handle = this.createHandleElement(point, 'corner');
      handle.setAttribute('data-index', index.toString());
      
      const editHandle: EditHandle = {
        element: handle,
        index,
        type: 'corner',
        position: point
      };

      handle.addEventListener('mousedown', (e) => this.onHandleMouseDown(e, editState, editHandle));
      
      group.appendChild(handle);
      handles.push(editHandle);
    });

    editState.handles = handles;
  }

  /**
   * Create handles for circle radius
   */
  private createCircleHandles(editState: EditState, geometry: any): void {
    const { cx, cy, r } = geometry;
    const handles: EditHandle[] = [];
    const group = editState.shape.getElement().parentNode as SVGGElement;
    
    // Create radius handle
    const radiusPoint = { x: cx + r, y: cy };
    const handle = this.createHandleElement(radiusPoint, 'radius');
    handle.setAttribute('data-index', '0');
    
    const editHandle: EditHandle = {
      element: handle,
      index: 0,
      type: 'radius',
      position: radiusPoint
    };

    handle.addEventListener('mousedown', (e) => this.onHandleMouseDown(e, editState, editHandle));
    
    group.appendChild(handle);
    handles.push(editHandle);

    editState.handles = handles;
  }

  /**
   * Create handles for ellipse
   */
  private createEllipseHandles(editState: EditState, geometry: any): void {
    const { cx, cy, rx, ry } = geometry;
    const handles: EditHandle[] = [];
    const group = editState.shape.getElement().parentNode as SVGGElement;
    
    // Create radius handles
    const radiusXPoint = { x: cx + rx, y: cy };
    const radiusYPoint = { x: cx, y: cy + ry };
    
    [radiusXPoint, radiusYPoint].forEach((point, index) => {
      const handle = this.createHandleElement(point, 'radius');
      handle.setAttribute('data-index', index.toString());
      
      const editHandle: EditHandle = {
        element: handle,
        index,
        type: 'radius',
        position: point
      };

      handle.addEventListener('mousedown', (e) => this.onHandleMouseDown(e, editState, editHandle));
      
      group.appendChild(handle);
      handles.push(editHandle);
    });

    editState.handles = handles;
  }

  /**
   * Create a handle element
   */
  private createHandleElement(position: Point, type: string): SVGElement {
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle.setAttribute('cx', position.x.toString());
    handle.setAttribute('cy', position.y.toString());
    handle.setAttribute('r', '6');
    handle.setAttribute('class', `annotation-handle annotation-handle-${type}`);
    return handle;
  }

  /**
   * Remove edit handles
   */
  private removeEditHandles(editState: EditState): void {
    editState.handles.forEach(handle => {
      if (handle.element.parentNode) {
        handle.element.parentNode.removeChild(handle.element);
      }
    });
    editState.handles = [];
  }

  /**
   * Setup shape-specific event listeners for editing
   */
  private setupShapeEventListeners(editState: EditState): void {
    const shapeElement = editState.shape.getElement();
    
    // Add mousedown listener for shape dragging
    const onShapeMouseDown = (e: MouseEvent) => {
      // Only handle if not clicking on a handle
      if ((e.target as Element).classList.contains('annotation-handle')) {
        return;
      }
      
      e.stopPropagation();
      e.preventDefault();
      
      editState.isDragging = true;
      editState.dragStartPoint = { x: e.clientX, y: e.clientY };
      editState.dragStartGeometry = editState.shape.getGeometry();
      editState.selectedHandle = null; // Clear any selected handle
    };

    // Store the listener reference for cleanup
    editState.shapeMouseDownListener = onShapeMouseDown;
    shapeElement.addEventListener('mousedown', onShapeMouseDown);
  }

  /**
   * Remove shape-specific event listeners
   */
  private removeShapeEventListeners(editState: EditState): void {
    const shapeElement = editState.shape.getElement();
    
    if (editState.shapeMouseDownListener) {
      shapeElement.removeEventListener('mousedown', editState.shapeMouseDownListener);
      editState.shapeMouseDownListener = null;
    }
  }

  /**
   * Handle mouse down on edit handle
   */
  private onHandleMouseDown(event: MouseEvent, editState: EditState, handle: EditHandle): void {
    event.stopPropagation();
    event.preventDefault();
    
    editState.selectedHandle = handle;
    editState.isDragging = true;
    editState.dragStartPoint = { x: event.clientX, y: event.clientY };
    editState.dragStartGeometry = editState.shape.getGeometry();
    
    handle.element.classList.add('active');
  }

  /**
   * Setup global event listeners
   */
  private setupGlobalListeners(): void {
    // Global mouse move for handle dragging
    document.addEventListener('mousemove', (e) => this.onGlobalMouseMove(e));
    document.addEventListener('mouseup', (e) => this.onGlobalMouseUp(e));
    
    // Global click to stop editing - but only when not in editing mode
    this.svg.addEventListener('click', (e) => {
      // Only handle clicks when not editing
      if (this.currentEditId) {
        return;
      }
      
      // Only stop editing if clicking on empty space (not on handles or shapes)
      if (e.target === this.svg || (e.target as Element).classList.contains('annotation-svg')) {
        this.stopAllEditing();
      }
    });
  }

  /**
   * Handle global mouse move
   */
  private onGlobalMouseMove(event: MouseEvent): void {
    if (!this.currentEditId) return;
    
    const editState = this.editStates.get(this.currentEditId);
    if (!editState || !editState.isDragging) return;

    const currentPoint = { x: event.clientX, y: event.clientY };
    
    if (editState.selectedHandle) {
      // Handle dragging
      this.handleHandleDrag(editState, editState.selectedHandle, currentPoint);
    } else {
      // Shape dragging
      this.handleShapeDrag(editState, currentPoint);
    }
  }

  /**
   * Handle global mouse up
   */
  private onGlobalMouseUp(event: MouseEvent): void {
    if (!this.currentEditId) return;
    
    const editState = this.editStates.get(this.currentEditId);
    if (!editState) return;

    if (editState.selectedHandle) {
      editState.selectedHandle.element.classList.remove('active');
      editState.selectedHandle = null;
    }
    
    editState.isDragging = false;
    editState.dragStartPoint = null;
    editState.dragStartGeometry = null;
  }

  /**
   * Handle handle dragging
   */
  private handleHandleDrag(editState: EditState, handle: EditHandle, currentPoint: Point): void {
    if (!editState.dragStartPoint || !editState.dragStartGeometry) return;

    const deltaX = currentPoint.x - editState.dragStartPoint.x;
    const deltaY = currentPoint.y - editState.dragStartPoint.y;
    
    // Update handle position
    handle.position = {
      x: handle.position.x + deltaX,
      y: handle.position.y + deltaY
    };
    
    handle.element.setAttribute('cx', handle.position.x.toString());
    handle.element.setAttribute('cy', handle.position.y.toString());
    
    // Update shape geometry based on handle type
    this.updateShapeFromHandle(editState, handle);
    
    // Update drag start point
    editState.dragStartPoint = currentPoint;
    
    this.emit('handleDragged', { 
      id: editState.id, 
      handleIndex: handle.index, 
      position: handle.position 
    });
  }

  /**
   * Handle shape dragging
   */
  private handleShapeDrag(editState: EditState, currentPoint: Point): void {
    if (!editState.dragStartPoint) return;

    const deltaX = currentPoint.x - editState.dragStartPoint.x;
    const deltaY = currentPoint.y - editState.dragStartPoint.y;
    
    // Move the shape
    editState.shape.moveBy(deltaX, deltaY);
    
    // Update handle positions
    this.updateHandlePositions(editState);
    
    // Update drag start point
    editState.dragStartPoint = currentPoint;
    
    this.emit('shapeMoved', { 
      id: editState.id, 
      deltaX, 
      deltaY 
    });
  }

  /**
   * Update shape geometry based on handle movement
   */
  private updateShapeFromHandle(editState: EditState, handle: EditHandle): void {
    const geometry = editState.shape.getGeometry();
    
    switch (geometry.type) {
      case 'polygon':
        if (handle.type === 'vertex') {
          geometry.points[handle.index] = handle.position;
          editState.shape.update(geometry);
        }
        break;
      case 'rectangle':
        if (handle.type === 'corner') {
          // Update rectangle based on corner movement
          this.updateRectangleFromCorner(geometry, handle);
          editState.shape.update(geometry);
        }
        break;
      case 'circle':
        if (handle.type === 'radius') {
          const newRadius = Math.sqrt(
            Math.pow(handle.position.x - geometry.cx, 2) + 
            Math.pow(handle.position.y - geometry.cy, 2)
          );
          geometry.r = newRadius;
          editState.shape.update(geometry);
        }
        break;
      case 'ellipse':
        if (handle.type === 'radius') {
          if (handle.index === 0) {
            geometry.rx = Math.abs(handle.position.x - geometry.cx);
          } else {
            geometry.ry = Math.abs(handle.position.y - geometry.cy);
          }
          editState.shape.update(geometry);
        }
        break;
    }
    
    this.emit('shapeResized', { id: editState.id, geometry });
  }

  /**
   * Update rectangle geometry from corner movement
   */
  private updateRectangleFromCorner(geometry: any, handle: EditHandle): void {
    const { x, y, width, height } = geometry;
    
    switch (handle.index) {
      case 0: // top-left
        geometry.x = handle.position.x;
        geometry.y = handle.position.y;
        geometry.width = x + width - handle.position.x;
        geometry.height = y + height - handle.position.y;
        break;
      case 1: // top-right
        geometry.y = handle.position.y;
        geometry.width = handle.position.x - x;
        geometry.height = y + height - handle.position.y;
        break;
      case 2: // bottom-right
        geometry.width = handle.position.x - x;
        geometry.height = handle.position.y - y;
        break;
      case 3: // bottom-left
        geometry.x = handle.position.x;
        geometry.width = x + width - handle.position.x;
        geometry.height = handle.position.y - y;
        break;
    }
  }

  /**
   * Update handle positions after shape movement
   */
  private updateHandlePositions(editState: EditState): void {
    const geometry = editState.shape.getGeometry();
    
    editState.handles.forEach(handle => {
      let newPosition: Point;
      
      switch (geometry.type) {
        case 'polygon':
          if (handle.type === 'vertex') {
            newPosition = geometry.points[handle.index];
          } else {
            return;
          }
          break;
        case 'rectangle':
          if (handle.type === 'corner') {
            const { x, y, width, height } = geometry;
            const corners = [
              { x, y }, // top-left
              { x: x + width, y }, // top-right
              { x: x + width, y: y + height }, // bottom-right
              { x, y: y + height } // bottom-left
            ];
            newPosition = corners[handle.index];
          } else {
            return;
          }
          break;
        case 'circle':
          if (handle.type === 'radius') {
            newPosition = { x: geometry.cx + geometry.r, y: geometry.cy };
          } else {
            return;
          }
          break;
        case 'ellipse':
          if (handle.type === 'radius') {
            if (handle.index === 0) {
              newPosition = { x: geometry.cx + geometry.rx, y: geometry.cy };
            } else {
              newPosition = { x: geometry.cx, y: geometry.cy + geometry.ry };
            }
          } else {
            return;
          }
          break;
        default:
          return;
      }
      
      handle.position = newPosition;
      handle.element.setAttribute('cx', newPosition.x.toString());
      handle.element.setAttribute('cy', newPosition.y.toString());
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAllEditing();
    this.editStates.clear();
  }
} 