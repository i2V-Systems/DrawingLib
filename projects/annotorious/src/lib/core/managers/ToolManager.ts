import { EventEmitter } from '../events/EventEmitter';
import { Point } from '../../types/shape.types';
import { Tool, ToolName } from '../../tools/base/Tool';
import { SvgOverlay } from '../annotator/SvgOverlay';

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
  private overlay: SvgOverlay;
  private eventListeners: {
    pointerdown: (event: PointerEvent) => void;
    pointermove: (event: PointerEvent) => void;
    pointerup: (event: PointerEvent) => void;
    dblclick: (event: PointerEvent) => void;
  };

  constructor(overlay: SvgOverlay) {
    super();
    
    this.overlay = overlay;
    this.tools = new Map();
    this.state = {
      activeTool: null,
      isDrawing: false
    };
    this.enabled = true;
    
    // Store event listener references for cleanup
    this.eventListeners = {
      pointerdown: this.handleSvgPointerDown.bind(this),
      pointermove: this.handleSvgPointerMove.bind(this),
      pointerup: this.handleSvgPointerUp.bind(this),
      dblclick: this.handleSvgDoubleClick.bind(this)
    };
  }

  /**
   * Add event listeners when a tool becomes active
   */
  private addEventListeners(): void {
    this.overlay.svg().addEventListener('pointerdown', this.eventListeners.pointerdown);
    this.overlay.svg().addEventListener('pointermove', this.eventListeners.pointermove);
    this.overlay.svg().addEventListener('pointerup', this.eventListeners.pointerup);
    this.overlay.svg().addEventListener('dblclick', this.eventListeners.dblclick as unknown as EventListener);
  }

  /**
   * Remove event listeners when no tool is active
   */
  private removeEventListeners(): void {
    this.overlay.svg().removeEventListener('pointerdown', this.eventListeners.pointerdown);
    this.overlay.svg().removeEventListener('pointermove', this.eventListeners.pointermove);
    this.overlay.svg().removeEventListener('pointerup', this.eventListeners.pointerup);
    this.overlay.svg().removeEventListener('dblclick', this.eventListeners.dblclick as unknown as EventListener);
  }

  /**
   * SVG event handlers
   */
  private handleSvgPointerDown(event: PointerEvent): void {
    if (this.enabled && this.state.isDrawing) {
      event.preventDefault();
      event.stopPropagation();
      const point = this.getMousePosition(event);
      this.handleMouseDown(point, event);
    }
  }

  private handleSvgPointerMove(event: PointerEvent): void {
    if (this.enabled && this.state.isDrawing) {
      event.preventDefault();
      event.stopPropagation();
      const point = this.getMousePosition(event);
      this.handleMouseMove(point, event);
    }
  }

  private handleSvgPointerUp(event: PointerEvent): void {
    if (this.enabled && this.state.isDrawing) {
      event.preventDefault();
      event.stopPropagation();
      const point = this.getMousePosition(event);
      this.handleMouseUp(point, event);
    }
  }

  private handleSvgDoubleClick(event: PointerEvent): void {
    if (this.enabled && this.state.isDrawing) {
      event.preventDefault();
      event.stopPropagation();
      const point = this.getMousePosition(event);
      this.handleDoubleClick(point, event);
    }
  }

  /**
   * Register a tool
   */
  registerTool(tool: Tool): void {
    if (!tool || typeof tool !== 'object') {
      this.emit('error', { message: 'Invalid tool provided' });
      return;
    }

    if (!tool.name || typeof tool.name !== 'string') {
      this.emit('error', { message: 'Tool must have a valid name' });
      return;
    }

    if (this.tools.has(tool.name)) {
      this.emit('error', { message: `Tool with name '${tool.name}' already exists` });
      return;
    }

    try {
      this.tools.set(tool.name, tool);
    } catch (error) {
      this.emit('error', { message: `Failed to register tool '${tool.name}': ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
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

    if (!name || typeof name !== 'string') {
      this.emit('error', { message: 'Invalid tool name provided' });
      return;
    }

    const tool = this.tools.get(name);
    if (!tool) {
      this.emit('error', { message: `Tool '${name}' not found` });
      return;
    }

    if (tool !== this.state.activeTool) {
      try {
        this.deactivateActiveTool();
        this.state.activeTool = tool;
        tool.activate();
        // Add event listeners when tool is activated
        this.addEventListeners();
        this.emit('toolActivated', { tool });
      } catch (error) {
        this.emit('error', { message: `Failed to activate tool '${name}': ${error instanceof Error ? error.message : 'Unknown error'}` });
      }
    }
  }

  /**
   * Deactivate the current tool
   */
  deactivateActiveTool(): void {
    if (this.state.activeTool) {
      const tool = this.state.activeTool;
      tool.deactivate();
      this.state.activeTool = null;
      // Remove event listeners when tool is deactivated
      this.removeEventListeners();
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
  handleMouseDown(point: Point, event: PointerEvent): void {
    if (!this.enabled) return;
    if (this.state.activeTool?.capabilities?.supportsMouse) {
      this.state.activeTool.handleMouseDown?.(point, event);
    }
  }

  /**
   * Handle mouse move event
   */
  handleMouseMove(point: Point, event: PointerEvent): void {
    if (!this.enabled) return;
    if (this.state.activeTool?.capabilities?.supportsMouse) {
      this.state.activeTool.handleMouseMove?.(point, event);
    }
  }

  /**
   * Handle mouse up event
   */
  handleMouseUp(point: Point, event: PointerEvent): void {
    if (!this.enabled) return;
    if (this.state.activeTool?.capabilities?.supportsMouse) {
      this.state.activeTool.handleMouseUp?.(point, event);
    }
  }

  /**
   * Handle double click event
   */
  handleDoubleClick(point: Point, event: PointerEvent): void {
    if (!this.enabled) return;
    if (this.state.activeTool && typeof this.state.activeTool.handleDoubleClick === 'function') {
      this.state.activeTool.handleDoubleClick(point, event);
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
   * Get mouse position in SVG coordinates
   */
  private getMousePosition(event: PointerEvent): Point {
    return this.overlay.screenToSvg(event.clientX, event.clientY);
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.deactivateActiveTool();
    this.tools.clear();
  }
}
