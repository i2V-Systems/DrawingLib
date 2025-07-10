import OpenSeadragon from 'openseadragon';
import { Annotator, AnnotatorConfig } from '../core/Annotator';
import type { Annotation, AnnotationBody } from '../core/annotation/types';
import { ShapeFactory } from '../shapes/base/ShapeFactory';
import type { BaseShape } from '../shapes/base/BaseShape';
import type { Theme, ShapeStyle } from '../core/style/StyleManager';

// Extend AnnotatorConfig to add the OpenSeadragon viewer
export interface OpenSeadragonAnnotatorConfig extends AnnotatorConfig {
  viewer: OpenSeadragon.Viewer;
}

export class OpenSeadragonAnnotator extends Annotator {
  private readonly viewer: OpenSeadragon.Viewer;

  private readonly _osdCanvasClickHandler: (evt: any) => void;
  private readonly _osdCanvasDragHandler: (evt: any) => void;
  private readonly _osdCanvasReleaseHandler: (evt: any) => void;
  private readonly _osdCanvasDblClickHandler: (evt: any) => void;
  private readonly _osdUpdateViewportHandler: () => void;
  private readonly _osdResizeHandler: () => void;

  constructor(config: OpenSeadragonAnnotatorConfig) {
    super(config);
    this.viewer = config.viewer;

    // Bind handlers so they can be removed later
    this._osdCanvasClickHandler = (evt: any) => this.forwardToTool('down', evt);
    this._osdCanvasDragHandler = (evt: any) => this.forwardToTool('move', evt);
    this._osdCanvasReleaseHandler = (evt: any) => this.forwardToTool('up', evt);
    this._osdCanvasDblClickHandler = (evt: any) => this.forwardToTool('dblclick', evt);
    this._osdUpdateViewportHandler = () => this.redrawAll();
    this._osdResizeHandler = () => this.redrawAll();

    // Wire OpenSeadragon events to tool manager (use bound references for later removal)
    this.viewer.addHandler('canvas-click', this._osdCanvasClickHandler);
    this.viewer.addHandler('canvas-drag', this._osdCanvasDragHandler);
    this.viewer.addHandler('canvas-release', this._osdCanvasReleaseHandler);
    this.viewer.addHandler('canvas-double-click', this._osdCanvasDblClickHandler);
    this.viewer.addHandler('update-viewport', this._osdUpdateViewportHandler);
    this.viewer.addHandler('resize', this._osdResizeHandler);
  }

  // Convert OSD event to SVG/image coordinates and forward to toolManager
  private forwardToTool(type: 'down' | 'move' | 'up' | 'dblclick', evt: any) {
    const webPoint = this.viewer.viewport.viewerElementToImageCoordinates(evt.position);
    const point = { x: webPoint.x, y: webPoint.y };

    // Create a synthetic MouseEvent for the SVG overlay
    const mouseEvent = new MouseEvent(
      type === 'down' ? 'mousedown' : type === 'move' ? 'mousemove' : type === 'up' ? 'mouseup' : 'dblclick',
      {
        bubbles: true,
        clientX: evt.position?.x,
        clientY: evt.position?.y,
      }
    );
    this.svg.dispatchEvent(mouseEvent);

    // Still call the toolManager for tools that use it directly
    if (type === 'down') this.toolManager.handleMouseDown(point, evt.originalEvent);
    else if (type === 'move') this.toolManager.handleMouseMove(point, evt.originalEvent);
    else if (type === 'up') this.toolManager.handleMouseUp(point, evt.originalEvent);
    else if (type === 'dblclick' && this.toolManager.handleDoubleClick) this.toolManager.handleDoubleClick(point, evt.originalEvent);
  }

  // Optionally override methods if OSD-specific behavior is needed
  // Otherwise, all annotation state and tool management is inherited from Annotator

  override setAnnotationStyle(id: string, style: Partial<ShapeStyle>): void {
    this.styleManager.setCustomStyle(id, style);
  }

  override removeAnnotationStyle(id: string): void {
    this.styleManager.removeCustomStyle(id);
  }

  override getTheme(): Theme {
    return this.styleManager.getTheme();
  }

  /**
   * Get the list of available tool names
   */
  public getAvailableTools(): string[] {
    return this.toolManager.getTools().map(tool => tool.name);
  }

  /**
   * Activate a tool by name
   */
  public activateTool(name: string): void {
    this.toolManager.activateTool(name);
  }

  /**
   * Get the currently active tool name
   */
  public getActiveTool(): string | null {
    const active = this.toolManager.getActiveTool();
    return active ? active.name : null;
  }

  // --- Overlay and Redraw ---
  private redrawAll() {
    // Remove all SVG children
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    // Redraw all shapes
    const annotations = this.state.getAll();
    for (const annotation of annotations) {
      const geometry = annotation.target.selector.geometry;
      const id = annotation.id!;
      // Get the shape from state (already created)
      let shape: BaseShape | undefined = (this.state as any).shapes?.get?.(id);
      if (!shape) {
        shape = ShapeFactory.createFromGeometry(id, geometry);
      } else {
        shape.update(geometry);
      }
      this.svg.appendChild(shape.getElement());
    }
  }


  /**
   * Clean up all event handlers and resources.
   * IMPORTANT: Always remove OpenSeadragon event handlers to prevent memory leaks.
   */
  override destroy(): void {
    // Remove OSD event handlers
    this.viewer.removeHandler('canvas-click', this._osdCanvasClickHandler);
    this.viewer.removeHandler('canvas-drag', this._osdCanvasDragHandler);
    this.viewer.removeHandler('canvas-release', this._osdCanvasReleaseHandler);
    this.viewer.removeHandler('canvas-double-click', this._osdCanvasDblClickHandler);
    this.viewer.removeHandler('update-viewport', this._osdUpdateViewportHandler);
    this.viewer.removeHandler('resize', this._osdResizeHandler);

    this.stopDrawing();
    this.state.clear();
    this.styleManager.destroy();
    this.labelManager.destroy();
    if (this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
  }
}
