import { BaseShape } from './base/BaseShape';
import { Geometry, Point } from '../types/shape.types';

export class PolygonShape extends BaseShape {
  private polygon: SVGPolygonElement;
  private points: Array<Point> = [];
  private editHandles: SVGCircleElement[] = [];
  private isDragging = false;
  private dragStartPoint: Point | null = null;
  private dragStartPoints: Point[] = [];

  constructor(id: string, geometry: Geometry) {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    super(id, polygon);
    this.polygon = polygon;
    this.update(geometry);
    this.setupEventListeners();
  }

  update(geometry: Geometry): void {
    if (geometry.type !== 'polygon') {
      throw new Error('Invalid geometry type');
    }

    this.points = geometry.points;
    const points = this.points.map(p => `${p.x},${p.y}`).join(' ');
    this.polygon.setAttribute('points', points);
    
    // Update edit handles if in editing mode
    if (this.isEditing()) {
      this.updateEditHandles();
    }
  }

  getGeometry(): Geometry {
    return {
      type: 'polygon',
      points: this.points,
    };
  }

  /**
   * Move the polygon by delta
   */
  override moveBy(deltaX: number, deltaY: number): void {
    this.points = this.points.map(point => ({
      x: point.x + deltaX,
      y: point.y + deltaY
    }));
    this.update({ type: 'polygon', points: this.points });
    this.emit('geometryChanged', { geometry: this.getGeometry() });
  }

  /**
   * Show edit handles for polygon points
   */
  protected override showEditHandles(): void {
    // Edit handles are now managed by EditManager
    this.element.classList.add('editing');
  }

  /**
   * Hide edit handles
   */
  protected override hideEditHandles(): void {
    // Edit handles are now managed by EditManager
    this.element.classList.remove('editing');
  }

  /**
   * Update edit handles positions
   */
  private updateEditHandles(): void {
    // Remove existing handles
    this.editHandles.forEach(handle => {
      if (handle.parentNode) {
        handle.parentNode.removeChild(handle);
      }
    });
    this.editHandles = [];

    // Create handles for each point
    this.points.forEach((point, index) => {
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      handle.setAttribute('cx', point.x.toString());
      handle.setAttribute('cy', point.y.toString());
      handle.setAttribute('r', '6');
      handle.setAttribute('class', 'annotation-handle');
      handle.setAttribute('data-point-index', index.toString());
      handle.style.display = 'block';

      // Add event listeners for dragging
      handle.addEventListener('mousedown', (e) => this.onHandleMouseDown(e, index));
      
      this.element.appendChild(handle);
      this.editHandles.push(handle);
    });
  }

  /**
   * Get edit handles positions
   */
  override getEditHandles(): { x: number; y: number; type: string }[] {
    return this.points.map((point, index) => ({
      x: point.x,
      y: point.y,
      type: 'point'
    }));
  }

  /**
   * Setup event listeners for dragging
   */
  private setupEventListeners(): void {
    // Event listeners are now managed by EditManager when editing is enabled
    // Only setup basic listeners for non-editing interactions
  }

  /**
   * Handle mouse down on the polygon
   */
  private onMouseDown(event: MouseEvent): void {
    // Mouse events are now handled by EditManager when editing is enabled
  }

  /**
   * Handle mouse move for dragging
   */
  private onMouseMove(event: MouseEvent): void {
    // Mouse events are now handled by EditManager when editing is enabled
  }

  /**
   * Handle mouse up to end dragging
   */
  private onMouseUp(event: MouseEvent): void {
    // Mouse events are now handled by EditManager when editing is enabled
  }

  /**
   * Handle mouse down on edit handle
   */
  private onHandleMouseDown(event: MouseEvent, pointIndex: number): void {
    // Handle events are now managed by EditManager
  }

  /**
   * Destroy the shape and clean up
   */
  override destroy(): void {
    this.editHandles.forEach(handle => {
      if (handle.parentNode) {
        handle.parentNode.removeChild(handle);
      }
    });
    this.editHandles = [];
    super.destroy();
  }
}
