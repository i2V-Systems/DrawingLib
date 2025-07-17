import { Point } from '../../types/shape.types';
import { EventEmitter } from '../../core/events/EventEmitter';

/**
 * Supported tool names
 */
export type ToolName = 'select' | 'rectangle' | 'polygon' | 'circle' | 'point' | string;

/**
 * Tool capabilities
 */
export interface ToolCapabilities {
  supportsMouse?: boolean;
  supportsEnableDisable?: boolean;
}

/**
 * Base abstract class for all annotation tools
 */
export abstract class Tool extends EventEmitter {
  /**
   * Unique name of the tool
   */
  abstract name: ToolName;

  /**
   * Tool capabilities
   */
  capabilities?: ToolCapabilities;

  constructor() {
    super();
  }

  /**
   * Activate the tool and attach event listeners (tools should use their own svg reference)
   */
  abstract activate(): void;

  /**
   * Deactivate the tool and detach event listeners (tools should use their own svg reference)
   */
  abstract deactivate(): void;

  /**
   * Handle mouse down event
   */
  handleMouseDown?(point: Point, event: PointerEvent): void;

  /**
   * Handle mouse move event
   */
  handleMouseMove?(point: Point, event: PointerEvent): void;

  /**
   * Handle mouse up event
   */
  handleMouseUp?(point: Point, event: PointerEvent): void;

  /**
   * Enable or disable the tool
   */
  setEnabled?(enabled: boolean): void;

  /**
   * Handle double click event
   */
  handleDoubleClick?(point: Point, event: PointerEvent): void;

  /**
   * Clean up resources
   */
  destroy?(): void;

  /**
   * Clamp a point to image bounds (utility for all tools)
   */
  protected static clampToImageBounds(point: Point, bounds: { naturalWidth: number, naturalHeight: number }): Point {
    return {
      x: Math.max(0, Math.min(point.x, bounds.naturalWidth)),
      y: Math.max(0, Math.min(point.y, bounds.naturalHeight))
    };
  }
}
