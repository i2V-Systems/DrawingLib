import { Geometry } from '../types';
import { Point } from '../types';
import { ShapeStyle } from '../../core/style/StyleManager';

interface ShapeEvents {
  select: { id: string };
  deselect: { id: string };
  hover: { id: string };
  unhover: { id: string };
}

export interface Shape {
  /**
   * Set selected state
   */
  setSelected(selected: boolean): void;

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

  /**
   * Apply style to the shape
   */
  applyStyle(style: ShapeStyle): void;

  /**
   * Destroy the shape and clean up
   */
  destroy(): void;

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
