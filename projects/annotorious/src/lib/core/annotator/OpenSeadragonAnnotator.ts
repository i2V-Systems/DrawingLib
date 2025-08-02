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
import { TextGeometry } from '../../types';
import { KeyboardManager } from '../managers';

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
  private keyboardManager: KeyboardManager;
  private readonly crosshair?: Crosshair;
  public pendingStyle?: ShapeStyle;
  public pendingLabelText?: string;
  public pendingAnnotationBody? : AnnotationBody;

  constructor(config: OpenSeadragonAnnotatorConfig) {
    super();
    this.config = {
      toolType: 'rectangle',
      autoSave: true,
      crosshair: true,
      ...config,
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
    this.state = new AnnotationState();
    this.editManager = new EditManager(this.svgOverlay);
    this.toolManager = new ToolManager(this.svgOverlay);
    this.keyboardManager = new KeyboardManager();

    // Listen for zoom changes and update StyleManager
    this.viewer.addHandler('zoom', () => {
      this.handleZoomChange();
    });

    this.viewer.addHandler('animation-finish', () => {
      this.handleZoomChange();
    });


    // Example shortcut: Delete selected shape
    this.keyboardManager.addBinding({
      key: 'Delete',
      action: () => {
        const selectedId = this.state.getSelectedId();
        if (selectedId) this.removeAnnotation(selectedId);
      }
    });


    this.keyboardManager.addBinding({
      key: 'Escape',
      action: () => {
        this.clearSelectionAndEditing();
      }
    });

    // Listen for geometry updates from EditManager
    this.editManager.on('updateGeometry', ({ id, geometry, type }) => {
      const annotation = this.state.getAnnotation(id);
      if (annotation) {
        if (type === 'label') {
          this.state.update(id, { label: geometry as TextGeometry }, false);
        } else {
          this.state.update(
            id,
            {
              target: {
                ...annotation.target,
                selector: {
                  ...annotation.target.selector,
                  geometry,
                },
              },
            },
            false
          );
        }
      }
    });

    // Initialize crosshair if enabled
    if (this.config.crosshair) {
      const crosshairConfig =
        typeof this.config.crosshair === 'boolean'
          ? { enabled: this.config.crosshair }
          : this.config.crosshair;
      this.crosshair = new Crosshair(this.svg, crosshairConfig);
    }

    // Bind manager events
    this.state.on('loaded', () => {
      const annotations = this.state.getAll();
      for (const annotation of annotations) {
        if (annotation.style) {
          this.styleManager.setCustomStyle(annotation.id, annotation.style);
        }
      }
      this.redrawAll();
    });
    this.state.on('create', (event: { id: string }) => {
      const annotation = this.state.getAnnotation(event.id);
      if (annotation) this.onAnnotationCreated(annotation);
    });

    this.state.on('update', (event: { id: string }) => {
      const annotation = this.state.getAnnotation(event.id);
      if (annotation) this.onAnnotationUpdated(annotation);
    });

    this.state.on('delete', (event: { annotation: Annotation }) => {
      this.onAnnotationDeleted(event.annotation);
    });

    this.state.on('select', (event: { id: string }) => {
      const annotation = this.state.getAnnotation(event.id);
      if (annotation) this.onAnnotationSelected(annotation);
    });

    this.state.on('deselect', (event: { id: string }) => {
      const annotation = this.state.getAnnotation(event.id);
      if (annotation) this.onAnnotationDeselected(annotation);
    });

    this.editManager.on('editingDragStarted', () =>
      this.viewer.setMouseNavEnabled(false)
    );
    this.editManager.on('editingDragStopped', () =>
      this.viewer.setMouseNavEnabled(true)
    );
    this.editManager.on('arrowSymbolClicked', (event) => {
      console.log('Arrow symbol clicked:', event);
      this.emit('context-menu', event);
    });

    // Get image natural width and height
    const containerBounds = this.svgOverlay.getContainerSize();

    // Register tools
    const tools = createTools(
      this.svg,
      (shape) => {
        if (shape) {
          // Remove the tool's shape from SVG before creating the annotation
          if (shape.getElement().parentNode) {
            shape.getElement().parentNode.removeChild(shape.getElement());
          }

          const geometry = this.svgOverlay.convertSvgGeometryToImage(
            shape.getGeometry()
          );
          const label = this.pendingLabelText
            ? ({ text: this.pendingLabelText, type: 'text' } as TextGeometry)
            : undefined;
          const body = this.pendingAnnotationBody ? [this.pendingAnnotationBody] : [];
          const shapeAnnotation: Annotation = {
            id: crypto.randomUUID(),
            type: 'Annotation',
            body,
            target: {
              source: config.imageUrl || '',
              selector: {
                type: 'SvgSelector',
                geometry,
              },
            },
            label: label,
            style: this.pendingStyle,
          };

          this.addAnnotation(shapeAnnotation);
          this.toolManager.deactivateActiveTool();
        }
      },
      containerBounds
    );

    tools.forEach((tool) => this.toolManager.registerTool(tool));

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

  private handleZoomChange(): void {
    const currentZoom = this.viewer.viewport.getZoom(true);

    // Update StyleManager with current zoom
    this.styleManager.setCurrentZoom(currentZoom);

    // Update all shapes with new zoom-adjusted styles
    this.updateZoomDependentShapeStyles();
  }

  private updateZoomDependentShapeStyles(): void {
    if (this.editManager.isEditing()) {
      const editingEntity = this.editManager.getCurrentEditingEntity();
      if (editingEntity) {
        const style = this.styleManager.getStyle(editingEntity.id);
        const shape = this.state.getShape(editingEntity.id);
        shape?.applyStyle(style);
      }
    }
  }

  private setupClickHandling(): void {
    // Handle click events for smart selection (when not in drawing mode)
    this.viewer.addHandler(
      'canvas-click',
      (event: OpenSeadragon.CanvasClickEvent) => {
        event.preventDefaultAction = false;

        // Don't handle clicks when drawing
        if (this.toolManager.isDrawing()) {
          return;
        }

        const webPoint = new OpenSeadragon.Point(
          event.position.x,
          event.position.y
        );
        const viewportPoint = this.viewer.viewport.pointFromPixel(webPoint);
        const img =
          this.viewer.viewport.viewportToImageCoordinates(viewportPoint);
        const imagePoint = { x: img.x, y: img.y };

        const hitResult = this.state.findHitAnnotation(imagePoint);
        if (hitResult) {
          this.clearSelectionAndEditing();
          this.selectAnnotation(hitResult.id);
        } else {
          this.clearSelectionAndEditing();
        }
      }
    );

    // Disable OpenSeadragon mouse gestures when drawing
    this.toolManager.on('drawingStarted', () => {
      this.viewer.setMouseNavEnabled(false);
    });

    this.toolManager.on('drawingStopped', () => {
      this.viewer.setMouseNavEnabled(true);
    });
  }

  private redrawAll(): void {
    const overlayNode = this.svgOverlay.node();
    while (overlayNode.firstChild) {
      overlayNode.removeChild(overlayNode.firstChild);
    }
    const annotations = this.state.getAll();
    for (const annotation of annotations) {
      const id = annotation.id!;
      if (!this.state.isAnnotationVisible(id)) {
        continue;
      }
      let shape = (this.state as any).shapes?.get?.(id);
      const geometry = annotation.target.selector.geometry;
      if (!shape) {
        shape = ShapeFactory.createFromGeometry(id, geometry);
        (this.state as any).shapes?.set?.(id, shape);
      } else {
        shape.update(geometry);
      }

      const svgElement = shape.getElement();
      overlayNode.appendChild(svgElement);

      // Apply styles to non-editing shapes
      const style = this.styleManager.getStyle(id);
      shape.applyStyle(style);
    }
  }

  loadAnnotations(annotations: Annotation[]): void {
    this.state.clear();
    const overlayNode = this.svgOverlay.node();
    while (overlayNode.firstChild) {
      overlayNode.removeChild(overlayNode.firstChild);
    }
    this.state.loadAnnotations(
      annotations.map((annotation) => {
        const shape = ShapeFactory.createFromGeometry(
          annotation.id || crypto.randomUUID(),
          convertToViewportCoordinates(
            annotation.target.selector.geometry,
            this.viewer.viewport
          )
        );
        return { annotation, shape };
      })
    );
  }
  // Update addAnnotation to remove svgOverlay parameter
  addAnnotation(annotation: Annotation): void {
    const shape = ShapeFactory.createFromGeometry(
      annotation.id || crypto.randomUUID(),
      convertToViewportCoordinates(
        annotation.target.selector.geometry,
        this.viewer.viewport
      )
    );
    this.state.add(annotation, shape);
    if (annotation.style) {
      this.styleManager.setCustomStyle(annotation.id, annotation.style);
    }

    const style = this.styleManager.getStyle(annotation.id);
    shape.applyStyle(style);
    this.redrawAll();
  }

  removeAnnotation(id: string): void {
    this.state.remove(id);
    this.redrawAll();
  }

  updateAnnotation(id: string, update: Partial<Annotation>): void {
    this.state.update(id, update);
    if (update.style) {
      this.styleManager.setCustomStyle(id, update.style);
    }

    const shape = this.state.getShape(id);
    if (shape) {
      const style = this.styleManager.getStyle(id);
      shape.applyStyle(style);
    }

    this.redrawAll();
  }

  getAnnotations(): Annotation[] {
    return this.state.getAll();
  }

  selectAnnotation(id: string): void {
    this.state.select(id);
  }

  clearSelectionAndEditing(): void {
    this.editManager.stopEditing();
    this.state.deselectAll();
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
        body: [...annotation.body, body],
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
    const updatedStyle = this.styleManager.getStyle(id);
    this.state.update(id, { style: updatedStyle }, false);
    const shape = this.state.getShape(id);
    shape?.applyStyle(updatedStyle);
  }

  changeArrowDirection(
    startIndex: number,
    endIndex: number,
    direction: 'up' | 'down' | 'both'
  ): void {
    this.editManager.changeArrowDirection(startIndex, endIndex, direction);
  }

  getTheme(): Theme {
    return this.styleManager.getTheme();
  }

  getAvailableTools(): string[] {
    return this.toolManager.getTools().map((tool) => tool.name);
  }

  activateTool(name: string): void {
    this.clearSelectionAndEditing();
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
 * Check if an annotation is visible
 */
isAnnotationVisible(id: string): boolean {
  return this.state.isAnnotationVisible(id);
}

/**
 * Hide multiple annotations by IDs
 */
hideAnnotations(ids: string[]): void {
  // Check if any of the IDs being hidden are currently being edited
  const currentEditingId = this.editManager.getCurrentEditingEntity()?.id;
  if (currentEditingId && ids.includes(currentEditingId)) {
    this.editManager.stopEditing();
    this.state.deselectAll();
  }

  ids.forEach(id => this.state.setAnnotationVisible(id, false));
  this.redrawAll(); // Single redraw for all changes
}

/**
 * Show multiple annotations by IDs  
 */
showAnnotations(ids: string[]): void {
  ids.forEach(id => this.state.setAnnotationVisible(id, true));
  this.redrawAll(); // Single redraw for all changes
}

/**
 * Get all hidden annotation IDs
 */
getHiddenAnnotationIds(): string[] {
  return this.state.getHiddenAnnotationIds();
}

/**
 * Get all visible annotation IDs
 */
getVisibleAnnotationIds(): string[] {
  return this.state.getVisibleAnnotationIds();
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
    this.keyboardManager.destroy();
    this.styleManager.destroy();
    this.editManager.destroy();
    // Destroy SVG overlay
    this.svgOverlay.destroy();

    // Clear state
    this.state.clear();
  }
  /**
   * Set or update label for an annotation
   */
  setLabel(
    annotationId: string,
    labelText: string,
    position?: { x: number; y: number }
  ): void {
    const annotation = this.state.getAnnotation(annotationId);
    if (!annotation) {
      throw new Error(`Annotation with id '${annotationId}' not found`);
    }

    const shape = this.state.getShape(annotationId);
    if (!shape) {
      throw new Error(`Shape for annotation '${annotationId}' not found`);
    }

    // Calculate default position if not provided
    let labelPosition = position;
    if (!labelPosition) {
      const shapeBbox = shape.getBBox();
      labelPosition = {
        x: shapeBbox.x + shapeBbox.width / 2,
        y: shapeBbox.y - 10, // 10px above the shape
      };
    }

    const labelGeometry: TextGeometry = {
      type: 'text',
      text: labelText,
      x: labelPosition.x,
      y: labelPosition.y,
    };

    // Update annotation with label
    this.state.update(annotationId, {
      label: labelGeometry,
    }, false);
    shape.updateLabel(labelGeometry);
    const style = this.styleManager.getStyle(annotationId)
    shape.applyStyle(style);
  }

  /**
   * Remove label from an annotation
   */
  removeLabel(annotationId: string): void {
    const annotation = this.state.getAnnotation(annotationId);
    if (!annotation || !annotation.label) {
      return;
    }
    const shape = this.state.getShape(annotationId);
    if (shape) {
      shape.removeLabel();
    }
    this.updateAnnotation(annotationId, {
      label: undefined,
    });

    this.emit('labelRemoved', { annotationId });
  }

  /**
   * Save changes made to the currently selected/editing shape
   */
  public saveSelectedShapeChanges(): boolean {
    const currentEntity = this.editManager.getCurrentEditingEntity();
    if (!currentEntity) {
      console.warn('No shape is currently selected for editing');
      return false;
    }

    return this.saveShapeChanges(currentEntity.id);
  }

  /**
   * Save changes for a specific shape
   */
  public saveShapeChanges(annotationId: string): boolean {
    const shape = this.state.getShape(annotationId);
    if (!shape) {
      console.warn(`Shape with ID ${annotationId} not found`);
      return false;
    }

    try {
      // Get current geometry from the shape
      const currentGeometry = shape.getGeometry();

      // Update the annotation data with current shape state
      this.updateAnnotation(annotationId, {
        target: {
          selector: {
            type: 'SvgSelector',
            geometry: currentGeometry,
          },
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to save shape changes:', error);
      return false;
    }
  }

  private onAnnotationCreated(annotation: Annotation): void {
    this.emit('create', annotation);
  }

  private onAnnotationUpdated(annotation: Annotation): void {
    this.emit('update', annotation);
  }

  private onAnnotationDeleted(annotation: Annotation): void {
    this.emit('delete', annotation);
    this.redrawAll();
  }

  private onAnnotationSelected(annotation: Annotation): void {
    const shape = this.state.getShape(annotation.id);
    if (shape) {
      shape.setSelected(true);

      // ==== Z-ORDER: Move selected shape to top ====
      const overlayNode = this.svgOverlay.node();
      const shapeElement = shape.getElement();
      // Remove and re-append to bring to top
      if (shapeElement.parentNode === overlayNode) {
        overlayNode.removeChild(shapeElement);
        overlayNode.appendChild(shapeElement);
      }
      this.editManager.startEditing(annotation.id, shape);

      this.emit('select', annotation);
    }
  }

  private onAnnotationDeselected(annotation: Annotation): void {
    const shape = this.state.getShape(annotation.id);
    if (shape) {
      shape.setSelected(false);
    }
    this.editManager.stopEditing();
    this.emit('update', annotation);
    this.emit('deselect', annotation);
  }
}
