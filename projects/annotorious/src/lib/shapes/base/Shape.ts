import { Geometry, TextGeometry } from '../../types/shape.types';
import { Point } from '../../types/shape.types';
import { ShapeStyle } from '../../core/managers/StyleManager';

interface ShapeEvents {
  select: { id: string };
  deselect: { id: string };
  hover: { id: string };
  unhover: { id: string };
  geometryChanged: { geometry: Geometry };
}

export interface Shape {
  /**
   * Set selected state
   */
  setSelected(selected: boolean, styleManager?: any, id?: string): void;

  /**
   * Set hovered state
   */
  setHovered(hovered: boolean): void;

  /**
   * Check if point is inside shape
   */
  containsPoint(point: Point): boolean;

  /**
   * Get the SVG element of the shape
   */
  getElement(): SVGGraphicsElement;

  /**
   * Get the geometry of the shape
   */
  getGeometry(): Geometry;

  /**
   * Update the shape's geometry
   */
  update(geometry: Geometry): void;

  updateLabel(label: TextGeometry): void;

  removeLabel(): void;
  /**
   * Apply style to the shape
   */
  applyStyle(style: ShapeStyle): void;

  /**
   * Destroy the shape and clean up
   */
  destroy(): void;

  /**
   * Enable editing mode for the shape
   */
  enableEditing(): void;

  /**
   * Disable editing mode for the shape
   */
  disableEditing(): void;

  /**
   * Check if shape is in editing mode
   */
  isEditing(): boolean;

  /**
   * Move the shape by delta
   */
  moveBy(deltaX: number, deltaY: number): void;

  /**
   * Get edit handles for the shape
   */
  getEditHandles(): { x: number; y: number; type: string }[];

  /**
   * Get the bounding box of the shape
   */
  getBBox(): { x: number; y: number; width: number; height: number };

  /**
   * Add event listener
   */
  on<K extends keyof ShapeEvents>(event: K, handler: (event: ShapeEvents[K]) => void): void;

  /**
   * Remove event listener
   */
  off<K extends keyof ShapeEvents>(event: K, handler: (event: ShapeEvents[K]) => void): void;

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void;
}
