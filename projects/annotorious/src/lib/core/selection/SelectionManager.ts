import { EventEmitter } from '../events/EventEmitter';
import { Shape } from '../../shapes/base';
import { Point } from '../../types/shape.types';

interface SelectionManagerEvents {
  select: { id: string; shape: Shape };
  deselect: { id: string };
  hover: { id: string; shape: Shape };
  unhover: { id: string };
}

/**
 * Manages selection and hover states for annotations
 */
export class SelectionManager extends EventEmitter<SelectionManagerEvents> {
  private state: SelectionState;
  private enabled: boolean;
  private shapes: Map<string, Shape>;

  constructor() {
    super();
    
    this.state = {
      selectedId: null,
      selectedShape: null,
      hoveredId: null,
      hoveredShape: null
    };

    this.enabled = true;
    this.shapes = new Map();
  }

  /**
   * Enable/disable selection
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearSelection();
      this.clearHover();
    }
  }

  /**
   * Register a shape for selection
   */
  registerShape(id: string, shape: Shape): void {
    this.shapes.set(id, shape);

    // Listen for shape events
    shape.on('select', () => this.select(id));
    shape.on('deselect', () => this.clearSelection());
    shape.on('hover', () => this.hover(id));
    shape.on('unhover', () => this.clearHover());
  }

  /**
   * Unregister a shape
   */
  unregisterShape(id: string): void {
    const shape = this.shapes.get(id);
    if (shape) {
      // Remove all listeners
      shape.removeAllListeners();
    }

    if (this.state.selectedId === id) {
      this.clearSelection();
    }
    if (this.state.hoveredId === id) {
      this.clearHover();
    }
    this.shapes.delete(id);
  }

  /**
   * Select a shape by ID
   */
  select(id: string): void {
    if (!this.enabled) return;

    const shape = this.shapes.get(id);
    if (shape && id !== this.state.selectedId) {
      // Deselect current
      if (this.state.selectedShape) {
        this.state.selectedShape.setSelected(false);
      }

      // Select new
      this.state.selectedId = id;
      this.state.selectedShape = shape;
      shape.setSelected(true);

      this.emit('select', { id, shape });
    }
  }

  /**
   * Clear current selection
   */
  clearSelection(): void {
    if (this.state.selectedShape) {
      this.state.selectedShape.setSelected(false);
      const id = this.state.selectedId!;
      this.state.selectedId = null;
      this.state.selectedShape = null;
      this.emit('deselect', { id });
    }
  }

  /**
   * Set hover state for a shape
   */
  hover(id: string): void {
    if (!this.enabled) return;

    const shape = this.shapes.get(id);
    if (shape && id !== this.state.hoveredId) {
      // Clear current hover
      if (this.state.hoveredShape) {
        this.state.hoveredShape.setHovered(false);
      }

      // Set new hover
      this.state.hoveredId = id;
      this.state.hoveredShape = shape;
      shape.setHovered(true);

      this.emit('hover', { id, shape });
    }
  }

  /**
   * Clear hover state
   */
  clearHover(): void {
    if (this.state.hoveredShape) {
      this.state.hoveredShape.setHovered(false);
      const id = this.state.hoveredId!;
      this.state.hoveredId = null;
      this.state.hoveredShape = null;
      this.emit('unhover', { id });
    }
  }

  /**
   * Find shape at point
   */
  findShapeAt(point: Point): { id: string; shape: Shape } | null {
    if (!this.enabled) return null;

    for (const [id, shape] of this.shapes) {
      if (shape.containsPoint(point)) {
        return { id, shape };
      }
    }
    return null;
  }

  /**
   * Get current selection state
   */
  getState(): SelectionState {
    return { ...this.state };
  }

  /**
   * Get currently selected shape
   */
  getSelected(): { id: string; shape: Shape } | null {
    return this.state.selectedId && this.state.selectedShape
      ? { id: this.state.selectedId, shape: this.state.selectedShape }
      : null;
  }

  /**
   * Get currently hovered shape
   */
  getHovered(): { id: string; shape: Shape } | null {
    return this.state.hoveredId && this.state.hoveredShape
      ? { id: this.state.hoveredId, shape: this.state.hoveredShape }
      : null;
  }

  /**
   * Clear all state
   */
  destroy(): void {
    this.clearSelection();
    this.clearHover();
    this.shapes.forEach(shape => shape.removeAllListeners());
    this.shapes.clear();
  }
}

export interface SelectionState {
  selectedId: string | null;
  selectedShape: Shape | null;
  hoveredId: string | null;
  hoveredShape: Shape | null;
}
