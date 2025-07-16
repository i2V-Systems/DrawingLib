import OpenSeadragon from 'openseadragon';
import { EventEmitter } from '../events/EventEmitter';
import { StyleManager } from '../managers/StyleManager';
import { ToolManager } from '../managers/ToolManager';
import { SelectionManager } from '../managers/SelectionManager';
import { AnnotationState } from '../store/AnnotationState';
import { ShapeFactory } from '../../shapes/base';
import { Annotation, AnnotationBody } from '../../types/annotation.types';
import { isTouchDevice, enableTouchTranslation } from '../../utils/Touch';
import { Theme, ShapeStyle } from '../managers/StyleManager';
import { Crosshair, CrosshairConfig } from './Crosshair';
import { createTools } from '../../tools';
import { SvgOverlay, SvgOverlayInfo } from './SvgOverlay';
import { EditManager } from '../managers/EditManager';

export interface OpenSeadragonAnnotatorConfig {
  viewer: OpenSeadragon.Viewer;
  toolType?: string;
  theme?: Theme;
  imageUrl?: string;
  autoSave?: boolean;
  crosshair?: CrosshairConfig | boolean;
}

export class OpenSeadragonAnnotator extends EventEmitter {
  private readonly config: OpenSeadragonAnnotatorConfig;
  private readonly viewer: OpenSeadragon.Viewer;
  private readonly svgOverlay: SvgOverlay;
  private readonly svg: SVGSVGElement;
  private readonly state: AnnotationState;
  private readonly styleManager: StyleManager;
  private readonly toolManager: ToolManager;
  private readonly selectionManager: SelectionManager;
  private readonly editManager: EditManager;
  private readonly crosshair?: Crosshair;

  constructor(config: OpenSeadragonAnnotatorConfig) {
    super();

    this.config = {
      toolType: 'rectangle',
      autoSave: true,
      crosshair: true,
      ...config
    };

    this.viewer = config.viewer;

    // Use the core SvgOverlay directly
    this.svgOverlay = new SvgOverlay(this.viewer, {
      className: 'annotation-svg',
      enableClickHandling: false,
      useNaturalCoordinates: true,
    });
    
    this.svg = this.svgOverlay.svg();
    
    // Add touch support
    const isTouch = isTouchDevice();
    if (isTouch) {
      this.svg.setAttribute('class', 'annotation-svg touch-device');
      enableTouchTranslation(this.svg as unknown as HTMLElement);
    }

    // Initialize style manager
    this.styleManager = new StyleManager(config.theme);
    const styleSheet = this.styleManager.createSVGStyles();
    const styleElement = document.createElement('style');
    styleElement.textContent = styleSheet;
    this.svg.appendChild(styleElement);

    this.styleManager.on('themeChanged', () => {
      styleElement.textContent = this.styleManager.createSVGStyles();
    });

    // Initialize managers
    this.selectionManager = new SelectionManager();
    this.editManager = new EditManager(this.svg);
    this.state = new AnnotationState(this.styleManager);
    this.toolManager = new ToolManager(this.svgOverlay);

    // Initialize crosshair if enabled
    if (this.config.crosshair) {
      const crosshairConfig = typeof this.config.crosshair === 'boolean' 
        ? { enabled: this.config.crosshair }
        : this.config.crosshair;
      
      this.crosshair = new Crosshair(this.svg, crosshairConfig);
    }

    // Bind manager events
    this.state.on('create', this.onAnnotationCreated.bind(this));
    this.state.on('update', this.onAnnotationUpdated.bind(this));
    this.state.on('delete', this.onAnnotationDeleted.bind(this));
    this.state.on('select', this.onAnnotationSelected.bind(this));
    this.state.on('deselect', this.onAnnotationDeselected.bind(this));


    // Get image natural width and height
    const item = this.viewer.world.getItemAt(0);
    const { x: naturalWidth, y: naturalHeight } = item.source.dimensions;
    const imageBounds = { naturalWidth, naturalHeight };

    // Register tools
    const tools = createTools(this.svg, (shape) => {
      if (shape) {
        // Remove the tool's shape from SVG before creating the annotation
        if (shape.getElement().parentNode) {
          shape.getElement().parentNode.removeChild(shape.getElement());
        }
        const geometry = shape.getGeometry();
        const groupId = crypto.randomUUID();
        const shapeAnnotation: Annotation = {
          id: crypto.randomUUID(),
          type: 'Annotation',
          groupId,
          body: [],
          target: {
            source: config.imageUrl || '',
            selector: {
              type: 'SvgSelector',
              geometry,
            }
          }
        };

        this.addAnnotation(shapeAnnotation);
        this.toolManager.deactivateActiveTool();
      }
    }, imageBounds);
    tools.forEach(tool => this.toolManager.registerTool(tool));


    // Setup click handling and keyboard shortcuts
    this.setupClickHandling();


    // Listen for tool manager events to update crosshair
    this.toolManager.on('toolActivated', (evt) => {
        this.toolManager.startDrawing();
        this.crosshair?.setDrawingMode(true);
    });

    this.toolManager.on('toolDeactivated', () => {
      // Stop drawing mode when a tool is deactivated
      this.toolManager.stopDrawing();
      this.crosshair?.setDrawingMode(false);
    });

    this.selectionManager.on('select', (evt) => this.state.select(evt.id));
    this.selectionManager.on('deselect', () => this.state.deselect());
    // Initial redraw
    this.redrawAll();
  }


  /**
   * Convert image coordinates to viewport coordinates
   * With the SVG overlay plugin, we need to convert from image coordinates
   * to viewport coordinates for rendering
   */
  private convertToViewportCoordinates(geometry: any): any {
    const viewport = this.viewer.viewport;

    const imageToViewport = (point: any) => {
      const viewportPoint = viewport.imageToViewportCoordinates(point.x, point.y);
      return { x: viewportPoint.x, y: viewportPoint.y };
    };

    switch (geometry.type) {
      case 'rectangle': {
        const topLeft = imageToViewport({ x: geometry.x, y: geometry.y });
        const bottomRight = imageToViewport({ x: geometry.x + geometry.width, y: geometry.y + geometry.height });
        return {
          ...geometry,
          x: topLeft.x,
          y: topLeft.y,
          width: bottomRight.x - topLeft.x,
          height: bottomRight.y - topLeft.y
        };
      }
      case 'circle': {
        const center = imageToViewport({ x: geometry.cx, y: geometry.cy });
        const radiusPoint = imageToViewport({ x: geometry.cx + geometry.r, y: geometry.cy });
        const radius = Math.sqrt(Math.pow(radiusPoint.x - center.x, 2) + Math.pow(radiusPoint.y - center.y, 2));
        return {
          ...geometry,
          cx: center.x,
          cy: center.y,
          r: radius
        };
      }
      case 'polygon':
      case 'freehand': {
        const viewportPoints = geometry.points.map((point: any) => imageToViewport(point));
        return {
          ...geometry,
          points: viewportPoints
        };
      }
      case 'point': {
        const viewportPoint = imageToViewport({ x: geometry.x, y: geometry.y });
        return {
          ...geometry,
          x: viewportPoint.x,
          y: viewportPoint.y
        };
      }
      case 'text': {
        const topLeft = imageToViewport({ x: geometry.x, y: geometry.y });
        const bottomRight = imageToViewport({ x: geometry.x + geometry.width, y: geometry.y + geometry.height });
        return {
          ...geometry,
          x: topLeft.x,
          y: topLeft.y,
          width: bottomRight.x - topLeft.x,
          height: bottomRight.y - topLeft.y
        };
      }
      default:
        return geometry;
    }
  }


  private setupClickHandling(): void {
    // Handle click events for smart selection (when not in drawing mode)
    this.viewer.addHandler('canvas-click', (event: OpenSeadragon.CanvasClickEvent) => {
      event.preventDefaultAction = false;

      // Don't handle clicks when drawing
      if (this.toolManager.isDrawing()) {
        return;
      }

      const webPoint = new OpenSeadragon.Point(event.position.x, event.position.y);
      const viewportPoint = this.viewer.viewport.pointFromPixel(webPoint);
      const img = this.viewer.viewport.viewportToImageCoordinates(viewportPoint);
      const imagePoint = { x: img.x, y: img.y };

      const hitResult = this.state.findHitAnnotation(imagePoint);

      if (hitResult) {
        // Clicked on an annotation - select it and enable editing
        this.selectAnnotation(hitResult.id);
        this.enableEditing(hitResult.id);
      } else {
        // Clicked on empty space - clear selection
        this.clearSelectionAndEditing();
      }
    });

    // Disable OpenSeadragon mouse gestures when drawing
    this.toolManager.on('drawingStarted', () => {
      this.viewer.setMouseNavEnabled(false);
    });

    this.toolManager.on('drawingStopped', () => {
      this.viewer.setMouseNavEnabled(true);
    });
  }



  private redrawAll(): void {
    // Clear the overlay node (not the entire SVG)
    const overlayNode = this.svgOverlay.node();
    while (overlayNode.firstChild) {
      overlayNode.removeChild(overlayNode.firstChild);
    }

    const annotations = this.state.getAll();
    for (const annotation of annotations) {
      const geometry = annotation.target.selector.geometry;
      const id = annotation.id!;
      let shape = (this.state as any).shapes?.get?.(id);

      if (!shape) {
        shape = ShapeFactory.createFromGeometry(id, geometry);
        (this.state as any).shapes?.set?.(id, shape);
      } else {
        shape.update(geometry);
      }

      const svgElement = shape.getElement();
      overlayNode.appendChild(svgElement);
    }
  }


  addAnnotation(annotation: Annotation): void {
    const shape = ShapeFactory.createFromGeometry(
      annotation.id || crypto.randomUUID(),
      this.convertToViewportCoordinates(annotation.target.selector.geometry)
    );
    this.state.add(annotation, shape);
    this.redrawAll();
  }

  removeAnnotation(id: string): void {
    this.state.remove(id);
    this.redrawAll();
  }

  updateAnnotation(id: string, update: Partial<Annotation>): void {
    this.state.update(id, update);
    this.redrawAll();
  }

  getAnnotations(): Annotation[] {
    return this.state.getAll();
  }

  selectAnnotation(id: string): void {
    this.selectionManager.select(id);
  }

  clearSelection(): void {
    this.selectionManager.clearSelection();
  }

  clearSelectionAndEditing(): void {
    this.editManager.stopAllEditing();
    this.selectionManager.clearSelection();
  }

  enableEditing(id: string): void {
    const shape = this.state.getShape(id);
    if (shape) {
      this.editManager.startEditing(id, shape);
    }
  }

  disableEditing(id: string): void {
    this.editManager.stopEditing(id);
  }

  moveAnnotation(id: string, deltaX: number, deltaY: number): void {
    const shape = this.state.getShape(id);
    if (shape) {
      shape.moveBy(deltaX, deltaY);
      this.redrawAll();
    }
  }

  addAnnotationBody(id: string, body: AnnotationBody): void {
    const annotation = this.state.getAnnotation(id);
    if (annotation) {
      this.state.update(id, {
        ...annotation,
        body: [...annotation.body, body]
      });
      this.redrawAll();
    }
  }

  removeAnnotationBody(id: string, bodyIndex: number): void {
    const annotation = this.state.getAnnotation(id);
    if (annotation) {
      const body = [...annotation.body];
      body.splice(bodyIndex, 1);
      this.state.update(id, { ...annotation, body });
      this.redrawAll();
    }
  }

  setTool(type: string): void {
    this.config.toolType = type;
  }

  setTheme(theme: Theme): void {
    this.styleManager.setTheme(theme);
    this.redrawAll();
  }

  setAnnotationStyle(id: string, style: Partial<ShapeStyle>): void {
    this.styleManager.setCustomStyle(id, style);
    this.redrawAll();
  }

  removeAnnotationStyle(id: string): void {
    this.styleManager.removeCustomStyle(id);
    this.redrawAll();
  }

  getTheme(): Theme {
    return this.styleManager.getTheme();
  }

  getSelectedAnnotation(): { id: string; shape: any } | null {
    return this.selectionManager.getSelected();
  }

  getHoveredAnnotation(): { id: string; shape: any } | null {
    return this.selectionManager.getHovered();
  }



  getAvailableTools(): string[] {
    return this.toolManager.getTools().map(tool => tool.name);
  }

  activateTool(name: string): void {
    this.toolManager.activateTool(name);
  }

  getActiveTool(): string | null {
    const active = this.toolManager.getActiveTool();
    return active ? active.name : null;
  }

  enableCrosshair(): void {
    this.crosshair?.enable();
  }

  disableCrosshair(): void {
    this.crosshair?.disable();
  }

  setCrosshairConfig(config: Partial<CrosshairConfig>): void {
    this.crosshair?.setConfig(config);
  }

  isCrosshairEnabled(): boolean {
    return this.crosshair?.isEnabled() || false;
  }

  /**
   * Get the SVG overlay instance for external use
   */
  getSvgOverlay(): SvgOverlayInfo {
    return this.svgOverlay;
  }

  // Removed createManualSvgOverlay: now always uses core SvgOverlay

  /**
   * Manually trigger a resize of the SVG overlay
   */
  resizeSvgOverlay(): void {
    this.svgOverlay.resize();
  }

  destroy(): void {
    // Clean up managers
    this.selectionManager.destroy();
    this.toolManager.destroy();
    this.crosshair?.destroy();
    // Destroy SVG overlay
    this.svgOverlay.destroy();
    // Clear state
    this.state.clear();
  }

  /**
   * Set the current annotations (replace all existing)
   */
  public setAnnotations(annotations: Annotation[]): void {
    // Clear current annotations and overlay
    this.state.clear();
    const overlayNode = this.svgOverlay.node();
    while (overlayNode.firstChild) {
      overlayNode.removeChild(overlayNode.firstChild);
    }

    // Add each annotation
    for (const annotation of annotations) {
      // Convert geometry from image to SVG/viewport coordinates for rendering
        const svgGeometry = this.convertToViewportCoordinates(annotation.target.selector.geometry);
        const shape = ShapeFactory.createFromGeometry(annotation.id || crypto.randomUUID(), svgGeometry);
        this.state.add(annotation, shape);
    }

    // Redraw all shapes
    this.redrawAll();
  }

  private onAnnotationCreated(evt: { annotation: Annotation }): void {
    this.emit('create', evt);
  }

  private onAnnotationUpdated(evt: { id: string; changes: Partial<Annotation> }): void {
    this.emit('update', evt);
    this.redrawAll();
  }

  private onAnnotationDeleted(evt: { id: string }): void {
    this.emit('delete', evt);
    this.redrawAll();
  }

  private onAnnotationSelected(evt: { id: string }): void {
    this.emit('select', evt);
  }

  private onAnnotationDeselected(evt: { id: string }): void {
    this.emit('deselect', evt);
  }

}