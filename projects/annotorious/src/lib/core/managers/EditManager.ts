import { PolylineArrowShape } from '../../shapes/ArrowPolylineShape';
import { Shape } from '../../shapes/base';
import { ArrowClickEvent } from '../../types';
import { Point, Geometry } from '../../types/shape.types';
import { SvgOverlay } from '../annotator';
import { EventEmitter } from '../events/EventEmitter';

export interface EditHandle {
  element: SVGElement;
  position: Point;
  onDrag: (newPos: Point) => void;
}

export class EditManager extends EventEmitter {
  private overlay: SvgOverlay;
  private editingShape: Shape | null = null;
  private editingShapeId: string | null = null;
  private handleListeners: WeakMap<SVGElement, (e: PointerEvent) => void> =
    new WeakMap();

  private dragContext: {
    type: 'handle' | 'shape' | 'label' | null;
    element?: SVGElement;
    lastPointerPos?: Point;
  } = { type: null };

  private listeners: { [key: string]: (e: PointerEvent) => void } = {};

  constructor(overlay: SvgOverlay) {
    super();
    this.overlay = overlay;
  }

  startEditing(id: string, shape: Shape): void {
    this.stopEditing();

    this.editingShape = shape;
    this.editingShapeId = id;

    this.overlay.svg().addEventListener('pointermove', this.onPointerMove);
    this.overlay.svg().addEventListener('pointerup', this.onPointerUp);

    shape.enableEditing();

    this.setupShapeDragging(shape);

    this.setupHandleDragging(shape);

    this.setupLabelDragging(shape);
    if (this.editingShape.getGeometry().type === 'polyline-arrow') {
      this.setupArrowSymbolClick(shape);
    }

    this.emit('editingStarted', { id });
  }

  private setupShapeDragging(shape: Shape): void {
    const targetElement = shape
      .getElement()
      .querySelector('.annotation-shape') as SVGElement;

    if (targetElement) {
      this.listeners['shapePointerDown'] = (e: PointerEvent) =>
        this.onShapePointerDown(e, targetElement);
      targetElement.addEventListener(
        'pointerdown',
        this.listeners['shapePointerDown']
      );

      // targetElement.style.cursor = 'move';
    }
  }

  private setupHandleDragging(shape: Shape): void {
    shape.getEditHandles().forEach((handle) => {
      const el = (handle as any).element;
      if (el) {
        const handler = (e: PointerEvent) => this.onHandlePointerDown(e, el);
        this.handleListeners.set(el, handler);
        el.addEventListener('pointerdown', handler);
        el.style.cursor = 'pointer';
      }
    });
  }

  private setupLabelDragging(shape: Shape): void {
    const labelElement = (shape as any).labelElement as SVGElement;
    if (labelElement) {
      this.listeners['labelPointerDown'] = (e: PointerEvent) =>
        this.onLabelPointerDown(e, labelElement);
      labelElement.addEventListener(
        'pointerdown',
        this.listeners['labelPointerDown']
      );
      labelElement.style.cursor = 'move';
    }
  }

// In EditManager.ts - Replace setupArrowSymbolClick method
private setupArrowSymbolClick(shape: Shape): void {
  if (!this.editingShape) return;
  if (!(this.editingShape instanceof PolylineArrowShape)) return;

  // Remove individual listeners, use delegation instead
  const arrowGroup = this.editingShape.getArrowGroup();
  
  const delegatedHandler = (event: MouseEvent) => {
    if (event.button !== 2) return; // Only handle right-clicks
    
    const target = event.target as SVGElement;
    if (!target.classList.contains('arrow-symbol')) return;
    
    event.stopPropagation();
    event.preventDefault();
    
    const startIndex = parseInt(target.getAttribute('data-start-index') || '0');
    const endIndex = parseInt(target.getAttribute('data-end-index') || '0');
    const direction = target.getAttribute('data-direction') as 'up' | 'down' | 'both';
    
    this.emit('arrowSymbolClicked', {
      annotationId: this.editingShapeId,
      startIndex,
      endIndex,
      direction,
      element: target,
      event
    } as ArrowClickEvent);
  };

  arrowGroup?.addEventListener('contextmenu', delegatedHandler);
  this.listeners['arrowGroupDelegate'] = delegatedHandler;
}


  stopEditing(): void {
    if (this.editingShape) {
      const geometry = this.editingShape.getGeometry();
      this.emit('updateGeometry', {
        id: this.editingShapeId,
        geometry,
        type: 'shape',
      });

      this.editingShape.disableEditing();

      const targetElement = this.editingShape
        .getElement()
        .querySelector('.annotation-shape') as SVGElement;

      if (targetElement && this.listeners['shapePointerDown']) {
        targetElement.removeEventListener(
          'pointerdown',
          this.listeners['shapePointerDown']
        );
        targetElement.style.cursor = '';
        delete this.listeners['shapePointerDown'];
      }

      const labelElement = (this.editingShape as any)
        .labelElement as SVGElement;
      if (labelElement && this.listeners['labelPointerDown']) {
        labelElement.removeEventListener(
          'pointerdown',
          this.listeners['labelPointerDown']
        );
        delete this.listeners['labelPointerDown'];
      }

      this.editingShape.getEditHandles().forEach((handle) => {
        const el = (handle as any).element;
        const handler = this.handleListeners.get(el);
        if (handler) {
          el.removeEventListener('pointerdown', handler);
          el.style.cursor = '';
          this.handleListeners.delete(el);
        }
      });

      this.emit('editingStopped', {
        id: this.editingShapeId,
        type: 'shape',
      });
    }

    this.editingShape = null;
    this.editingShapeId = null;
    this.overlay.svg().removeEventListener('pointermove', this.onPointerMove);
    this.overlay.svg().removeEventListener('pointerup', this.onPointerUp);
    this.dragContext = { type: null };
  }

  private onShapePointerDown(event: PointerEvent, element: SVGElement): void {
    event.stopPropagation();
    this.dragContext = {
      type: 'shape',
      element,
      lastPointerPos: this.getSVGPoint(event),
    };
    this.emit('editingDragStarted', { type: 'shape' });
  }

  private onLabelPointerDown(event: PointerEvent, element: SVGElement): void {
    event.stopPropagation();
    this.dragContext = {
      type: 'label',
      element,
      lastPointerPos: this.getSVGPoint(event),
    };
    this.emit('editingDragStarted', { type: 'label' });
  }

  private onHandlePointerDown(
    event: PointerEvent,
    handleElement: SVGElement
  ): void {
    event.stopPropagation();
    this.dragContext = {
      type: 'handle',
      element: handleElement,
      lastPointerPos: this.getSVGPoint(event),
    };
    this.emit('editingDragStarted', { type: 'handle' });
  }

  private onPointerMove = (event: PointerEvent) => {
    if (
      !this.editingShape ||
      !this.dragContext.type ||
      !this.dragContext.lastPointerPos
    )
      return;

    const currentPos = this.getSVGPoint(event);
    const deltaX = currentPos.x - this.dragContext.lastPointerPos.x;
    const deltaY = currentPos.y - this.dragContext.lastPointerPos.y;

    if (this.dragContext.type === 'shape') {
      const clampedDelta = this.clampShapeToSVG(
        this.editingShape,
        deltaX,
        deltaY
      );
      this.editingShape.moveBy(clampedDelta.deltaX, clampedDelta.deltaY);
      this.dragContext.lastPointerPos = currentPos;
      this.emit('entityDragged', {
        id: this.editingShapeId,
        type: 'shape',
        delta: { x: clampedDelta.deltaX, y: clampedDelta.deltaY },
      });
    } else if (this.dragContext.type === 'label') {
      const newPosition = { x: currentPos.x, y: currentPos.y };
      (this.editingShape as any).updateLabel({
        text: (this.editingShape as any).labelElement.textContent,
        ...newPosition,
      });
      this.dragContext.lastPointerPos = currentPos;
      this.emit('entityDragged', {
        id: this.editingShapeId,
        type: 'label',
        delta: { x: deltaX, y: deltaY },
      });
    } else if (this.dragContext.type === 'handle' && this.dragContext.element) {
      const clampedPos = this.clampPointToSVG(currentPos);
      (this.editingShape as any).updateFromHandle(
        this.dragContext.element,
        clampedPos
      );
      this.emit('handleDragged', {
        id: this.editingShapeId,
        handleElement: this.dragContext.element,
        position: clampedPos,
      });
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.dragContext.type) {
      if (this.dragContext.type === 'label' && this.editingShape) {
        const labelGeometry = {
          x: parseFloat(
            (this.editingShape as any).labelElement.getAttribute('x')
          ),
          y: parseFloat(
            (this.editingShape as any).labelElement.getAttribute('y')
          ),
          text: (this.editingShape as any).labelElement.textContent,
          type: 'text',
        };
        const shapeGeometry = this.editingShape.getGeometry();
        this.emit('updateGeometry', {
          id: this.editingShapeId,
          geometry: shapeGeometry,
          type: 'shape',
        });
        this.emit('updateGeometry', {
          id: this.editingShapeId,
          geometry: labelGeometry,
          type: 'label',
        });
      }
      this.emit('editingDragStopped', {
        type: this.dragContext.type,
      });
    }
    this.dragContext = { type: null };
  };

  private getSVGPoint(event: PointerEvent): Point {
    return this.overlay.eventToImage(event);
  }

  private clampPointToSVG(point: Point): Point {
    const imageBounds = this.overlay.getImageDimensions();
    return {
      x: Math.max(0, Math.min(point.x, imageBounds.width)),
      y: Math.max(0, Math.min(point.y, imageBounds.height)),
    };
  }

  private clampShapeToSVG(
    shape: Shape,
    deltaX: number,
    deltaY: number
  ): { deltaX: number; deltaY: number } {
    const bbox = shape.getBBox();
    const imageBounds = this.overlay.getImageDimensions();

    const clampedDeltaX = Math.max(
      -bbox.x,
      Math.min(deltaX, imageBounds.width - bbox.x - bbox.width)
    );
    const clampedDeltaY = Math.max(
      -bbox.y,
      Math.min(deltaY, imageBounds.height - bbox.y - bbox.height)
    );

    return { deltaX: clampedDeltaX, deltaY: clampedDeltaY };
  }

  getCurrentEditingEntity(): { id: string; type: 'shape' } | null {
    return this.editingShape && this.editingShapeId
      ? {
          id: this.editingShapeId,
          type: 'shape',
        }
      : null;
  }

  isEditing(): boolean {
    return this.editingShape !== null;
  }

  isEditingEntity(id: string): boolean {
    return this.editingShapeId === id;
  }

  public changeArrowDirection(startIndex : number, endIndex : number, direction :'up' | 'down' | 'both'): void {
    (this.editingShape as PolylineArrowShape).setArrowDirection(startIndex, endIndex, direction);
    this.emit('updateGeometry', {
      id: this.editingShapeId,
      geometry: (this.editingShape as PolylineArrowShape).getGeometry(),
      type: 'shape',
    });
  }
}
