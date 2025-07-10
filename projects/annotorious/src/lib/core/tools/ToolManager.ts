import { EventEmitter } from '../events/EventEmitter';
import { Point } from '../../shapes/types';
import { Tool, ToolName } from './Tool';

/**
 * Tool manager state
 */
interface ToolState {
  activeTool: Tool | null;
  isDrawing: boolean;
}

/**
 * Tool manager events
 */
interface ToolManagerEvents {
  toolActivated: { tool: Tool };
  toolDeactivated: { tool: Tool };
  drawingStarted: void;
  drawingStopped: void;
  error: { message: string };
}

/**
 * Manages annotation tools and their states
 */
export class ToolManager extends EventEmitter<ToolManagerEvents> {
  private tools: Map<ToolName, Tool>;
  private state: ToolState;
  private enabled: boolean;

  constructor() {
    super();
    
    this.tools = new Map();
    this.state = {
      activeTool: null,
      isDrawing: false
    };
    this.enabled = true;
  }

  /**
   * Register a tool
   */
  registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      this.emit('error', { message: `Tool with name '${tool.name}' already exists` });
      return;
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: ToolName): void {
    if (this.state.activeTool?.name === name) {
      this.deactivateActiveTool();
    }
    this.tools.delete(name);
  }

  /**
   * Activate a tool by name
   */
  activateTool(name: ToolName): void {
    if (!this.enabled) return;

    const tool = this.tools.get(name);
    if (!tool) {
      this.emit('error', { message: `Tool '${name}' not found` });
      return;
    }

    if (tool !== this.state.activeTool) {
      this.deactivateActiveTool();
      this.state.activeTool = tool;
      tool.activate();
      this.emit('toolActivated', { tool });
    }
  }

  /**
   * Deactivate the current tool
   */
  deactivateActiveTool(): void {
    if (this.state.activeTool) {
      const tool = this.state.activeTool;
      this.state.activeTool.deactivate();
      this.state.activeTool = null;
      this.emit('toolDeactivated', { tool });
    }
  }

  /**
   * Enable/disable tool manager
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.deactivateActiveTool();
    }
  }

  /**
   * Start drawing mode
   */
  startDrawing(): void {
    if (!this.enabled) return;
    this.state.isDrawing = true;
    this.emit('drawingStarted', undefined);
  }

  /**
   * Stop drawing mode
   */
  stopDrawing(): void {
    if (this.state.isDrawing) {
      this.state.isDrawing = false;
      this.emit('drawingStopped', undefined);
    }
  }

  /**
   * Handle mouse down event
   */
  handleMouseDown(point: Point, event: MouseEvent): void {
    if (!this.enabled) return;
    if (this.state.activeTool?.capabilities?.supportsMouse) {
      this.state.activeTool.handleMouseDown?.(point, event);
    }
  }

  /**
   * Handle mouse move event
   */
  handleMouseMove(point: Point, event: MouseEvent): void {
    if (!this.enabled) return;
    if (this.state.activeTool?.capabilities?.supportsMouse) {
      this.state.activeTool.handleMouseMove?.(point, event);
    }
  }

  /**
   * Handle mouse up event
   */
  handleMouseUp(point: Point, event: MouseEvent): void {
    if (!this.enabled) return;
    if (this.state.activeTool?.capabilities?.supportsMouse) {
      this.state.activeTool.handleMouseUp?.(point, event);
    }
  }

  /**
   * Handle double click event
   */
  handleDoubleClick(point: Point, event: MouseEvent): void {
    if (!this.enabled) return;
    if (this.state.activeTool && typeof this.state.activeTool.handleDoubleClick === 'function') {
      this.state.activeTool.handleDoubleClick(point, event);
    }
  }

  /**
   * Handle key down event
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;
    if (this.state.activeTool?.capabilities?.supportsKeyboard) {
      this.state.activeTool.handleKeyDown?.(event);
    }
  }

  /**
   * Handle key up event
   */
  handleKeyUp(event: KeyboardEvent): void {
    if (!this.enabled) return;
    if (this.state.activeTool?.capabilities?.supportsKeyboard) {
      this.state.activeTool.handleKeyUp?.(event);
    }
  }

  /**
   * Get current tool state
   */
  getState(): ToolState {
    return { ...this.state };
  }

  /**
   * Get active tool
   */
  getActiveTool(): Tool | null {
    return this.state.activeTool;
  }

  /**
   * Check if currently drawing
   */
  isDrawing(): boolean {
    return this.state.isDrawing;
  }

  /**
   * Get all registered tools
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.deactivateActiveTool();
    this.tools.clear();
  }
}
