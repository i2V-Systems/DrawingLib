import { EventEmitter } from '../events/EventEmitter';

export interface ShapeStyle {
  // Fill
  fill: string;
  fillOpacity: number;
  
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

  // Selection
  selectedFill: string;
  selectedStroke: string;
  selectedStrokeWidth: number;

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
    fill: '#ffffff',
    fillOpacity: 0.2,
    stroke: '#000000',
    strokeWidth: 2,
    strokeOpacity: 1,
    handleFill: '#ffffff',
    handleStroke: '#000000',
    handleSize: 8,
    handleStrokeWidth: 1,
    selectedFill: '#ffffff',
    selectedStroke: '#4a90e2',
    selectedStrokeWidth: 2,
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
    fill: '#000000',
    fillOpacity: 0.2,
    stroke: '#ffffff',
    handleFill: '#000000',
    handleStroke: '#ffffff',
    selectedFill: '#000000',
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
    this.emit('styleChanged', { id, style });
  }

  /**
   * Remove custom style for an annotation
   */
  removeCustomStyle(id: string): void {
    this.customStyles.delete(id);
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


  /**
   * Create CSS styles for SVG elements
   */
  createSVGStyles(): string {
    const { shapes } = this.currentTheme;
    
    return `
      .annotation-shape {
        fill: ${shapes.fill};
        fill-opacity: ${shapes.fillOpacity};
        stroke: ${shapes.stroke};
        stroke-width: ${shapes.strokeWidth};
        stroke-opacity: ${shapes.strokeOpacity};
        vector-effect: non-scaling-stroke;
      }

      .annotation-shape.selected {
        fill: ${shapes.selectedFill};
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
  }
}
