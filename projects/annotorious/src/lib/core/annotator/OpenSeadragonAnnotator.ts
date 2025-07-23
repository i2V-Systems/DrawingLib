import OpenSeadragon from 'openseadragon';
import { EventEmitter } from '../events/EventEmitter';
import { StyleManager } from '../managers/StyleManager';
import { ToolManager } from '../managers/ToolManager';
import { AnnotationState } from '../store/AnnotationState';
import { ShapeFactory } from '../../shapes/base';
import { Annotation, AnnotationBody } from '../../types/annotation.types';
import { isTouchDevice, enableTouchTranslation } from '../../utils/Touch';
import { Theme, ShapeStyle } from '../managers/StyleManager';
import { Crosshair, CrosshairConfig } from './Crosshair';
import { createTools } from '../../tools';
import { SvgOverlay, SvgOverlayInfo } from './SvgOverlay';
import { EditManager } from '../managers/EditManager';
import { convertToViewportCoordinates } from '../../utils/SVGUtils';


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
    this.state = new AnnotationState(this.styleManager);
    this.editManager = new EditManager(this.svg);
    this.toolManager = new ToolManager(this.svgOverlay);

    this.editManager.on('editingDragStarted', () => this.viewer.setMouseNavEnabled(false));
    this.editManager.on('editingDragStopped', () => this.viewer.setMouseNavEnabled(true));
    // Listen for geometry updates from EditManager
    this.editManager.on('updateGeometry', ({ id, geometry }) => {
      const annotation = this.state.getAnnotation(id);
      if (annotation) {
        this.updateAnnotation(id, {
          target: {
            ...annotation.target,
            selector: {
              ...annotation.target.selector,
              geometry
            }
          }
        });
      }
    });

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

    // Initial redraw
    this.redrawAll();
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
        // **KEY FIX**: Always clear previous selection and editing first
        this.clearSelectionAndEditing();
        
        // Then select the new annotation
        this.selectAnnotation(hitResult.id);
        this.enableEditing(hitResult.id);
      } else {
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
      convertToViewportCoordinates(annotation.target.selector.geometry, this.viewer.viewport)
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
    const annotation = this.state.getAnnotation(id);
    this.state.selectGroup(annotation?.groupId || '');
  }

  clearSelectionAndEditing(): void {
    this.editManager.stopEditing();
    this.state.deselectAll();
  }

  enableEditing(id: string): void {
    const shape = this.state.getShape(id);
    if (shape) {
      this.editManager.startEditing(id, shape);
    }
  }

  disableEditing(id: string): void {
    this.editManager.stopEditing();
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


  getTheme(): Theme {
    return this.styleManager.getTheme();
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

  /**
   * Manually trigger a resize of the SVG overlay
   */
  resizeSvgOverlay(): void {
    this.svgOverlay.resize();
  }

  destroy(): void {
    // Clean up managers
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
        const svgGeometry = convertToViewportCoordinates(annotation.target.selector.geometry, this.viewer.viewport);
        const shape = ShapeFactory.createFromGeometry(annotation.id || crypto.randomUUID(), svgGeometry);
        this.state.add(annotation, shape);
    }

    // Redraw all shapes
    this.redrawAll();
  }

  private onAnnotationCreated(evt: { groupId: string }): void {
    this.emit('create', evt);
  }

  private onAnnotationUpdated(evt: { groupId: string }): void {
    this.emit('update', evt);
    this.redrawAll();
  }

  private onAnnotationDeleted(evt: { groupId: string }): void {
    this.emit('delete', evt);
    this.redrawAll();
  }

  private onAnnotationSelected(evt: { groupId: string }): void {
    this.emit('select', evt);
  }

  private onAnnotationDeselected(evt: { groupId: string }): void {
    this.emit('deselect', evt);
  }

}