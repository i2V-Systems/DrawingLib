import OpenSeadragon from 'openseadragon';
import { EventEmitter } from './events/EventEmitter';
import { AnnotationState } from './state/AnnotationState';
import { ShapeFactory } from '../shapes/base';
import { Annotation, AnnotationBody } from '../types/annotation.types';
import { SVGUtils } from '../utils/SVGUtils';
import { StyleManager, Theme, ShapeStyle } from './style/StyleManager';
import { LabelManager } from './labels/LabelManager';
import { ToolManager } from './tools/ToolManager';
import { SelectionManager } from './selection/SelectionManager';

import { EditManager } from './editing/EditManager';
import { Crosshair, CrosshairConfig } from './Crosshair';
import { isTouchDevice, enableTouchTranslation } from '../utils/Touch';
import { createTools } from '../shapes/tools';

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
  private readonly svg: SVGSVGElement;
  private readonly state: AnnotationState;
  private readonly styleManager: StyleManager;
  private readonly labelManager: LabelManager;
  private readonly toolManager: ToolManager;
  private readonly selectionManager: SelectionManager;

  private readonly editManager: EditManager;
  private readonly crosshair?: Crosshair;
  private readonly _osdUpdateViewportHandler: () => void;
  private readonly _osdResizeHandler: () => void;

  constructor(config: OpenSeadragonAnnotatorConfig) {
    super();

    this.config = {
      toolType: 'rectangle',
      autoSave: true,
      crosshair: true,
      ...config
    };

    this.viewer = config.viewer;

    // Create SVG layer
    this.svg = SVGUtils.createElement('svg') as SVGSVGElement;
    this.svg.setAttribute('pointer-events', 'all');
    this.svg.style.position = 'absolute';
    this.svg.style.top = '0';
    this.svg.style.left = '0';
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';

    // Add touch support
    const isTouch = isTouchDevice();
    if (isTouch) {
      this.svg.setAttribute('class', 'annotation-svg touch-device');
      enableTouchTranslation(this.svg as unknown as HTMLElement);
    } else {
      this.svg.setAttribute('class', 'annotation-svg');
    }

    // Add overlay to viewer - this is the key advantage
    this.viewer.addOverlay({
      element: this.svg as unknown as HTMLElement,
      location: new OpenSeadragon.Rect(0, 0, 1, 1),
    });

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
    this.labelManager = new LabelManager(this.svg);
    this.selectionManager = new SelectionManager();
    this.editManager = new EditManager(this.svg);
    this.state = new AnnotationState(this.styleManager);
    this.toolManager = new ToolManager(this.svg);

    // Initialize crosshair if enabled
    if (this.config.crosshair) {
      const crosshairConfig = typeof this.config.crosshair === 'boolean' 
        ? { enabled: this.config.crosshair }
        : this.config.crosshair;
      
      this.crosshair = new Crosshair(this.svg, crosshairConfig);
    }

    // Bind manager events
    this.labelManager.on('labelClicked', (evt: { id: string }) => {
      this.selectAnnotation(evt.id);
      this.enableEditing(evt.id);
    });

    this.editManager.on('editingStarted', (evt) => this.emit('editingStarted', evt));
    this.editManager.on('editingStopped', (evt) => this.emit('editingStopped', evt));
    this.editManager.on('shapeMoved', (evt) => this.emit('shapeMoved', evt));
    this.editManager.on('shapeResized', (evt) => this.emit('shapeResized', evt));
    this.editManager.on('labelSelected', (evt) => this.emit('labelSelected', evt));

    this.state.on('create', this.onAnnotationCreated.bind(this));
    this.state.on('update', this.onAnnotationUpdated.bind(this));
    this.state.on('delete', this.onAnnotationDeleted.bind(this));
    this.state.on('select', this.onAnnotationSelected.bind(this));
    this.state.on('deselect', this.onAnnotationDeselected.bind(this));

    this.selectionManager.on('select', (evt) => this.state.select(evt.id));
    this.selectionManager.on('deselect', () => this.state.deselect());

    // Register tools
    const tools = createTools(this.svg, (shape) => {
      if (shape) {
        // Remove the tool's shape from SVG before creating the annotation
        // This prevents it from being removed by redrawAll()
        if (shape.getElement().parentNode) {
          shape.getElement().parentNode.removeChild(shape.getElement());
        }
        
        const geometry = this.convertToImageCoordinates(shape.getGeometry());
        this.addAnnotation({
          type: 'Annotation',
          body: [],
          target: {
            source: config.imageUrl || '',
            selector: {
              type: 'SvgSelector',
              geometry,
            }
          }
        } as any);
        
        // Deactivate the current drawing tool - smart selection will handle annotation interaction
        this.toolManager.deactivateActiveTool();
      }
    });
    tools.forEach(tool => this.toolManager.registerTool(tool));

    // Setup OpenSeadragon event handlers
    this._osdUpdateViewportHandler = () => this.redrawAll();
    this._osdResizeHandler = () => this.redrawAll();
    this.viewer.addHandler('animation', this._osdUpdateViewportHandler);
    this.viewer.addHandler('update-viewport', this._osdUpdateViewportHandler);
    this.viewer.addHandler('resize', this._osdResizeHandler);
    
    // Set up SVG viewBox when image loads
    this.viewer.addHandler('open', () => {
      this.updateSVGViewBox();
    });

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

  /**
   * Convert SVG coordinates to image coordinates (as percentages)
   * This is crucial for storing annotations in image space
   */
  private convertToImageCoordinates(geometry: any): any {
    const viewport = this.viewer.viewport;
    const imageSize = this.viewer.world.getItemAt(0).getContentSize();
    
    switch (geometry.type) {
      case 'rectangle':
        return {
          ...geometry,
          x: (geometry.x / viewport.getContainerSize().x) * imageSize.x,
          y: (geometry.y / viewport.getContainerSize().y) * imageSize.y,
          width: (geometry.width / viewport.getContainerSize().x) * imageSize.x,
          height: (geometry.height / viewport.getContainerSize().y) * imageSize.y
        };
      
      case 'circle':
        return {
          ...geometry,
          cx: (geometry.cx / viewport.getContainerSize().x) * imageSize.x,
          cy: (geometry.cy / viewport.getContainerSize().y) * imageSize.y,
          r: Math.min(
            (geometry.r / viewport.getContainerSize().x) * imageSize.x,
            (geometry.r / viewport.getContainerSize().y) * imageSize.y
          )
        };
      
      case 'polygon':
      case 'freehand':
        const imagePoints = geometry.points.map((point: any) => ({
          x: (point.x / viewport.getContainerSize().x) * imageSize.x,
          y: (point.y / viewport.getContainerSize().y) * imageSize.y
        }));
        return {
          ...geometry,
          points: imagePoints
        };
      
      case 'point':
        return {
          ...geometry,
          x: (geometry.x / viewport.getContainerSize().x) * imageSize.x,
          y: (geometry.y / viewport.getContainerSize().y) * imageSize.y
        };
      
      default:
        return geometry;
    }
  }

  /**
   * Convert image coordinates (as percentages) to SVG coordinates
   * This is used when rendering annotations
   */
  private convertToViewportCoordinates(geometry: any): any {
    // When using an overlay with location: new OpenSeadragon.Rect(0, 0, 1, 1),
    // OpenSeadragon automatically scales and positions the overlay to match the image.
    // The SVG coordinates inside the overlay should be in the image coordinate system.
    // No conversion needed - just return the image coordinates directly.
    
    switch (geometry.type) {
      case 'rectangle':
        return {
          ...geometry,
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height
        };
      
      case 'circle':
        return {
          ...geometry,
          cx: geometry.cx,
          cy: geometry.cy,
          r: geometry.r
        };
      
      case 'polygon':
      case 'freehand':
        return {
          ...geometry,
          points: geometry.points
        };
      
      case 'point':
        return {
          ...geometry,
          x: geometry.x,
          y: geometry.y
        };
      
      default:
        return geometry;
    }
  }





  private setupClickHandling(): void {
    // Handle click events for smart selection (when not in drawing mode)
    this.viewer.addHandler('canvas-click', (event: OpenSeadragon.CanvasClickEvent) => {
      event.preventDefaultAction = false;

      // Don't handle clicks when drawing or already editing
      if (this.toolManager.isDrawing() || this.editManager.isEditing()) {
        return;
      }

      const rect = this.svg.getBoundingClientRect();
      const point = {
        x: event.position.x - rect.left,
        y: event.position.y - rect.top
      };
      const hitResult = this.state.findHitAnnotation(point);

      if (hitResult) {
        // Clicked on an annotation - select it and enable editing
        this.selectAnnotation(hitResult.id);
        this.enableEditing(hitResult.id);
        this.emit('select', { id: hitResult.id, distance: hitResult.distance });
      } else {
        // Clicked on empty space - clear selection
        this.clearSelectionAndEditing();
        this.emit('deselect', {});
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

  private updateSVGViewBox(): void {
    const imageSize = this.viewer.world.getItemAt(0).getContentSize();
    this.svg.setAttribute('viewBox', `0 0 ${imageSize.x} ${imageSize.y}`);
    this.svg.setAttribute('preserveAspectRatio', 'none');
  }

  private redrawAll(): void {
    this.updateSVGViewBox()
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

    const annotations = this.state.getAll();
    for (const annotation of annotations) {
      const geometry = annotation.target.selector.geometry;
      const id = annotation.id!;
      let shape = (this.state as any).shapes?.get?.(id);

      if (!shape) {
        shape = ShapeFactory.createFromGeometry(id, this.convertToViewportCoordinates(geometry));
        (this.state as any).shapes?.set?.(id, shape);
      } else {
        shape.update(this.convertToViewportCoordinates(geometry));
      }

      const svgElement = shape.getElement();
      this.svg.appendChild(svgElement);
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
    this.state.select(id);
  }

  clearSelection(): void {
    this.state.deselect();
  }

  clearSelectionAndEditing(): void {
    this.editManager.stopAllEditing();
    this.state.deselect();
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

  destroy(): void {
    // Remove event listeners
    this.viewer.removeHandler('animation', this._osdUpdateViewportHandler);
    this.viewer.removeHandler('update-viewport', this._osdUpdateViewportHandler);
    this.viewer.removeHandler('resize', this._osdResizeHandler);

    // Clean up managers
    this.toolManager.destroy();
    this.editManager.destroy();
    this.crosshair?.destroy();

    // Clear state
    this.state.clear();
  }

  private onAnnotationCreated(evt: { annotation: Annotation }): void {
    const { annotation } = evt;
    const geometry = annotation.target.selector.geometry;
    
    // Create label if annotation has text body
    const textBody = annotation.body.find(body => body.purpose === 'commenting');
    if (textBody && textBody.value) {
      const labelPosition = this.calculateLabelPosition(geometry);
      this.labelManager.setLabel(annotation.id!, {
        text: textBody.value,
        position: 'top',
        offset: 8
      });
      this.labelManager.updatePosition(annotation.id!, labelPosition);
    }

    this.emit('create', evt);
    // Note: redrawAll() is already called in addAnnotation(), so we don't need to call it here
  }

  private calculateLabelPosition(geometry: any): { x: number; y: number } {
    switch (geometry.type) {
      case 'rectangle':
        return { x: geometry.x + geometry.width / 2, y: geometry.y };
      
      case 'circle':
        return { x: geometry.cx, y: geometry.cy - geometry.r };
      
      case 'polygon':
      case 'freehand':
        if (geometry.points && geometry.points.length > 0) {
          const center = geometry.points.reduce(
            (acc: any, point: any) => ({ x: acc.x + point.x, y: acc.y + point.y }),
            { x: 0, y: 0 }
          );
          return {
            x: center.x / geometry.points.length,
            y: center.y / geometry.points.length
          };
        }
        return { x: 0, y: 0 };
      
      case 'point':
        return { x: geometry.x, y: geometry.y };
      
      default:
        return { x: 0, y: 0 };
    }
  }

  private onAnnotationUpdated(evt: { id: string; changes: Partial<Annotation> }): void {
    const { id, changes } = evt;
    
    // Update label if text body changed
    if (changes.body) {
      const textBody = changes.body.find(body => body.purpose === 'commenting');
      if (textBody && textBody.value) {
        this.labelManager.setLabel(id, {
          text: textBody.value,
          position: 'top',
          offset: 8
        });
      }
    }

    this.emit('update', evt);
    this.redrawAll();
  }

  private onAnnotationDeleted(evt: { id: string }): void {
    this.labelManager.removeLabel(evt.id);
    this.emit('delete', evt);
    this.redrawAll();
  }

  private onAnnotationSelected(evt: { id: string }): void {
    this.labelManager.setVisible(evt.id, true);
    this.emit('select', evt);
  }

  private onAnnotationDeselected(evt: { id: string }): void {
    this.labelManager.setVisible(evt.id, false);
    this.emit('deselect', evt);
  }
}