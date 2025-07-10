import { Point } from '../../shapes/types';

/**
 * Supported tool names
 */
export type ToolName = 'select' | 'rectangle' | 'polygon' | 'circle' | 'point' | string;

/**
 * Tool capabilities
 */
export interface ToolCapabilities {
  supportsMouse?: boolean;
  supportsKeyboard?: boolean;
  supportsEnableDisable?: boolean;
}

/**
 * Base interface for all annotation tools
 */
export interface Tool {
  /**
   * Unique name of the tool
   */
  name: ToolName;

  /**
   * Tool capabilities
   */
  capabilities?: ToolCapabilities;

  /**
   * Activate the tool
   */
  activate(): void;

  /**
   * Deactivate the tool
   */
  deactivate(): void;

  /**
   * Handle mouse down event
   */
  handleMouseDown?(point: Point, event: MouseEvent): void;

  /**
   * Handle mouse move event
   */
  handleMouseMove?(point: Point, event: MouseEvent): void;

  /**
   * Handle mouse up event
   */
  handleMouseUp?(point: Point, event: MouseEvent): void;

  /**
   * Handle key down event
   */
  handleKeyDown?(event: KeyboardEvent): void;

  /**
   * Handle key up event
   */
  handleKeyUp?(event: KeyboardEvent): void;

  /**
   * Enable or disable the tool
   */
  setEnabled?(enabled: boolean): void;

  /**
   * Handle double click event
   */
  handleDoubleClick?(point: Point, event: MouseEvent): void;

  /**
   * Clean up resources
   */
  destroy?(): void;
}
