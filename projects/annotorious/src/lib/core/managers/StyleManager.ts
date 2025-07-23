import { EventEmitter } from '../events/EventEmitter';

export interface ShapeStyle {
  // Stroke
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  strokeOpacity: number;

  // Handles
  handleFill: string;
  handleStroke: string;
  handleSize: number;
  handleStrokeWidth: number;

  selectedStroke: string;
  selectedStrokeWidth?: number; // Now optional

  // Hover
  hoverFill: string;
  hoverStroke: string;
  hoverStrokeWidth: number;
}


export interface Theme {
  shapes: ShapeStyle;
}

/**
 * Default light theme
 */
export const lightTheme: Theme = {
  shapes: {
    stroke: '#000000',
    strokeWidth: 2,
    strokeOpacity: 1,
    handleFill: '#ffffff',
    handleStroke: '#000000',
    handleSize: 8,
    handleStrokeWidth: 1,
    selectedStroke: '#4a90e2',
    hoverFill: '#ffffff',
    hoverStroke: '#4a90e2',
    hoverStrokeWidth: 2
  }
};

/**
 * Default dark theme
 */
export const darkTheme: Theme = {
  shapes: {
    ...lightTheme.shapes,
    stroke: '#ffffff',
    handleFill: '#000000',
    handleStroke: '#ffffff',
    selectedStroke: '#4a90e2',
    hoverFill: '#000000',
    hoverStroke: '#4a90e2'
  }
};

/**
 * Manages annotation styles and themes
 */
export class StyleManager extends EventEmitter {
  private currentTheme: Theme;
  private customStyles: Map<string, Partial<ShapeStyle>>;
  private annotationStyles: Map<string, ShapeStyle> = new Map();
  // **NEW**: Track original styles before selection
  private originalStyles: Map<string, ShapeStyle> = new Map();

  constructor(theme: Theme = lightTheme) {
    super();
    this.currentTheme = { ...theme };
    this.customStyles = new Map();
  }

  /**
   * Set the current theme
   */
  setTheme(theme: Theme): void {
    this.currentTheme = { ...theme };
    this.emit('themeChanged', { theme });
  }

  /**
   * Get the current theme
   */
  getTheme(): Theme {
    return { ...this.currentTheme };
  }

  /**
   * Set custom style for an annotation
   */
  setCustomStyle(id: string, style: Partial<ShapeStyle>): void {
    this.customStyles.set(id, style);
    // Update annotationStyles with the new custom style merged over the default style
    const merged = this.getMergedStyle(id, style);
    this.annotationStyles.set(id, merged);
    this.emit('styleChanged', { id, style });
  }

  /**
   * Remove custom style for an annotation
   */
  removeCustomStyle(id: string): void {
    this.customStyles.delete(id);
    this.annotationStyles.delete(id); // Also remove from annotationStyles
    this.emit('styleRemoved', { id });
  }

  /**
   * Get style for an annotation
   */
  getStyle(id: string): ShapeStyle {
    const customStyle = this.customStyles.get(id);
    return customStyle 
      ? { ...this.currentTheme.shapes, ...customStyle }
      : { ...this.currentTheme.shapes };
  }

  getMergedStyle(id: string, partial?: Partial<ShapeStyle>): ShapeStyle {
    const base = this.getStyle(id);
    return { ...base, ...partial };
  }

  setAnnotationStyle(id: string, style: Partial<ShapeStyle>) {
    const merged = this.getMergedStyle(id, style);
    this.annotationStyles.set(id, merged);
  }

  getAnnotationStyle(id: string): ShapeStyle | undefined {
    return this.annotationStyles.get(id);
  }

  /**
   * Store original style before applying selection style
   */
  storeOriginalStyle(id: string, style: ShapeStyle): void {
    if (!this.originalStyles.has(id)) {
      this.originalStyles.set(id, { ...style });
    }
  }

  /**
   * Restore original style when deselecting
   */
  restoreOriginalStyle(id: string): ShapeStyle {
    const original = this.originalStyles.get(id);
    if (original) {
      this.originalStyles.delete(id);
      return original;
    }
    return this.getStyle(id);
  }

  /**
   * Apply selection style and store original
   */
  applySelectionStyle(id: string): ShapeStyle {
    const currentStyle = this.getAnnotationStyle(id) || this.getStyle(id);
    this.storeOriginalStyle(id, currentStyle);
    const baseWidth = this.currentTheme.shapes.strokeWidth;
    return this.getMergedStyle(id, {
      stroke: this.currentTheme.shapes.selectedStroke,
      strokeWidth: baseWidth + 2
    });
  }

  /**
   * Create CSS styles for SVG elements
   */
  createSVGStyles(): string {
    const { shapes } = this.currentTheme;
    
    return `
      .annotation-shape {
        stroke: ${shapes.stroke};
        stroke-width: ${shapes.strokeWidth};
        stroke-opacity: ${shapes.strokeOpacity};
        vector-effect: non-scaling-stroke;
      }

      .annotation-shape.selected {
        stroke: ${shapes.selectedStroke};
        stroke-width: ${shapes.selectedStrokeWidth};
      }

      .annotation-shape.hover {
        fill: ${shapes.hoverFill};
        stroke: ${shapes.hoverStroke};
        stroke-width: ${shapes.hoverStrokeWidth};
      }

      .annotation-handle {
        fill: ${shapes.handleFill};
        stroke: ${shapes.handleStroke};
        stroke-width: ${shapes.handleStrokeWidth};
        r: ${shapes.handleSize / 2}px;
        vector-effect: non-scaling-stroke;
      }
    `;
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.customStyles.clear();
    this.annotationStyles.clear();
  }
}
