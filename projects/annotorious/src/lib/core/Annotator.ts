import { EventEmitter } from './events/EventEmitter';
import { AnnotationState } from './state/AnnotationState';
import { BaseSelector, SelectorFactory } from '../shapes/selectors';
import { ShapeFactory } from '../shapes/base';
import { Annotation, AnnotationBody } from './annotation/types';
import { SVGUtils } from '../utils/SVGUtils';
import { StyleManager, Theme, ShapeStyle } from './style/StyleManager';
import { LabelManager } from './labels/LabelManager';
import { ToolManager } from './tools/ToolManager';
import { createTools } from '../shapes/tools';

export interface AnnotatorConfig {
  container: HTMLElement;
  selectorType?: string;
  formatters?: any[];
  theme?: Theme;
}

export class Annotator extends EventEmitter {
  protected readonly config: AnnotatorConfig;
  protected readonly container: HTMLElement;
  protected readonly svg: SVGSVGElement;
  protected readonly state: AnnotationState;
  protected readonly styleManager: StyleManager;
  protected readonly labelManager: LabelManager;
  protected readonly toolManager: ToolManager;
  protected currentSelector: BaseSelector | null;

  constructor(config: AnnotatorConfig) {
    super();

    this.config = {
      selectorType: 'rectangle',
      ...config
    };

    // Use provided container
    this.container = config.container;
    this.container.style.position = 'relative';
    this.container.style.display = 'inline-block';

    // Create SVG layer
    this.svg = SVGUtils.createElement('svg') as SVGSVGElement;
    this.svg.style.position = 'absolute';
    this.svg.style.top = '0';
    this.svg.style.left = '0';
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    this.container.appendChild(this.svg);

    // Initialize style manager
    this.styleManager = new StyleManager(config.theme);
    
    // Apply initial styles
    const styleSheet = this.styleManager.createSVGStyles();
    const styleElement = document.createElement('style');
    styleElement.textContent = styleSheet;
    this.svg.appendChild(styleElement);

    // Listen for style changes
    this.styleManager.on('themeChanged', () => {
      styleElement.textContent = this.styleManager.createSVGStyles();
    });

    // Initialize label manager
    this.labelManager = new LabelManager(this.svg);

    // Listen for label clicks to select annotation
    this.labelManager.on('labelClicked', (evt: { id: string }) => {
      this.selectAnnotation(evt.id);
    });

    // Initialize state with style manager
    this.state = new AnnotationState(this.styleManager);

    // Bind state events
    this.state.on('create', this.onAnnotationCreated.bind(this));
    this.state.on('update', this.onAnnotationUpdated.bind(this));
    this.state.on('delete', this.onAnnotationDeleted.bind(this));
    this.state.on('select', this.onAnnotationSelected.bind(this));
    this.state.on('deselect', this.onAnnotationDeselected.bind(this));

    // Initialize tool manager
    this.toolManager = new ToolManager();
    
    // Register tools
    const tools = createTools(this.svg, (shape) => {
      // Handle shape completion
      if (shape) {
        this.addAnnotation({
          type: 'Annotation',
          body: [],
          target: {
            source: '', // No image source, must be set by caller if needed
            selector: {
              type: 'SvgSelector',
              geometry: shape.getGeometry()
            }
          }
        } as any);
      }
    });
    
    tools.forEach(tool => this.toolManager.registerTool(tool));
    
    // Initialize selector
    this.currentSelector = null;
  }

  /**
   * Start drawing mode
   */
  startDrawing(toolType?: string): void {
    try {
      const type = toolType || this.config.selectorType || 'rectangle';
      this.toolManager.activateTool(type);
      this.toolManager.startDrawing();
    } catch (error) {
      console.error(`Failed to start drawing with tool '${toolType}':`, error);
    }
  }

  /**
   * Stop drawing mode
   */
  stopDrawing(): void {
    this.toolManager.stopDrawing();
    this.toolManager.deactivateActiveTool();
    this.currentSelector = null;
  }

  /**
   * Add an annotation
   */
  addAnnotation(annotation: Annotation): void {
    const shape = ShapeFactory.createFromGeometry(
      annotation.id || crypto.randomUUID(),
      annotation.target.selector.geometry
    );
    this.state.add(annotation, shape);
  }

  /**
   * Remove an annotation
   */
  removeAnnotation(id: string): void {
    this.state.remove(id);
  }

  /**
   * Update an annotation
   */
  updateAnnotation(id: string, update: Partial<Annotation>): void {
    this.state.update(id, update);
  }

  /**
   * Get all annotations
   */
  getAnnotations(): Annotation[] {
    return this.state.getAll();
  }

  /**
   * Select an annotation
   */
  selectAnnotation(id: string): void {
    this.state.select(id);
  }

  /**
   * Deselect the current annotation
   */
  clearSelection(): void {
    this.state.deselect();
  }

  /**
   * Add a comment or tag to an annotation
   */
  addAnnotationBody(id: string, body: AnnotationBody): void {
    const annotation = this.state.getAnnotation(id);
    if (annotation) {
      this.state.update(id, {
        ...annotation,
        body: [...annotation.body, body]
      });
    }
  }

  /**
   * Remove a comment or tag from an annotation
   */
  removeAnnotationBody(id: string, bodyIndex: number): void {
    const annotation = this.state.getAnnotation(id);
    if (annotation) {
      const body = [...annotation.body];
      body.splice(bodyIndex, 1);
      this.state.update(id, { ...annotation, body });
    }
  }

  /**
   * Set the current selector type
   */
  setSelector(type: string): void {
    this.config.selectorType = type;
    if (this.currentSelector) {
      this.startDrawing(type);
    }
  }

  /**
   * Set the current theme
   */
  setTheme(theme: Theme): void {
    this.styleManager.setTheme(theme);
  }

  /**
   * Set custom style for an annotation
   */
  setAnnotationStyle(id: string, style: Partial<ShapeStyle>): void {
    this.styleManager.setCustomStyle(id, style);
  }

  /**
   * Remove custom style from an annotation
   */
  removeAnnotationStyle(id: string): void {
    this.styleManager.removeCustomStyle(id);
  }

  /**
   * Get current theme
   */
  getTheme(): Theme {
    return this.styleManager.getTheme();
  }

  /**
   * Destroy the annotator and clean up
   */
  destroy(): void {
    this.stopDrawing();
    this.state.clear();
    this.styleManager.destroy();
    this.labelManager.destroy();
    if (this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
  }

  protected onAnnotationCreated(evt: { annotation: Annotation }): void {
    // Create label for the annotation
    if (evt.annotation.body && evt.annotation.body.length > 0) {
      const firstBody = evt.annotation.body[0];
      const labelText = firstBody.value || 'Untitled';
      this.labelManager.setLabel(evt.annotation.id!, {
        text: labelText,
        position: 'top'
      });

      // Update label position based on geometry
      const geometry = evt.annotation.target.selector.geometry;
      const labelPosition = this.calculateLabelPosition(geometry);
      this.labelManager.updatePosition(evt.annotation.id!, labelPosition);
    }

    this.emit('createAnnotation', evt);
  }

  protected calculateLabelPosition(geometry: any): { x: number; y: number } {
    switch (geometry.type) {
      case 'rectangle':
        return {
          x: geometry.x + geometry.width / 2,
          y: geometry.y
        };
      case 'circle':
        return {
          x: geometry.cx,
          y: geometry.cy - geometry.r
        };
      case 'ellipse':
        return {
          x: geometry.cx,
          y: geometry.cy - geometry.ry
        };
      case 'polygon':
      case 'freehand':
        // Calculate centroid for polygons and freehand
        const points = geometry.points;
        const sumX = points.reduce((sum: number, p: any) => sum + p.x, 0);
        const sumY = points.reduce((sum: number, p: any) => sum + p.y, 0);
        return {
          x: sumX / points.length,
          y: sumY / points.length
        };
      default:
        return { x: 0, y: 0 };
    }
  }

  protected onAnnotationUpdated(evt: { id: string; changes: Partial<Annotation> }): void {
    // Update label if body changed
    if (evt.changes.body) {
      const firstBody = evt.changes.body[0];
      if (firstBody) {
        this.labelManager.setLabel(evt.id, {
          text: firstBody.value || 'Untitled',
          position: 'top'
        });
      }
    }

    // Update label position if geometry changed
    if (evt.changes.target?.selector?.geometry) {
      const labelPosition = this.calculateLabelPosition(evt.changes.target.selector.geometry);
      this.labelManager.updatePosition(evt.id, labelPosition);
    }

    this.emit('updateAnnotation', evt);
  }

  protected onAnnotationDeleted(evt: { id: string }): void {
    // Remove the label
    this.labelManager.removeLabel(evt.id);
    this.emit('deleteAnnotation', evt);
  }

  protected onAnnotationSelected(evt: { id: string }): void {
    // Show label when annotation is selected
    this.labelManager.setVisible(evt.id, true);
    this.emit('selectAnnotation', evt);
  }

  protected onAnnotationDeselected(evt: { id: string }): void {
    // Hide label when annotation is deselected
    this.labelManager.setVisible(evt.id, false);
    this.emit('deselectAnnotation', evt);
  }
}
