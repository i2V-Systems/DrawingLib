import { EventEmitter } from '../events/EventEmitter';

export interface ShapeStyle {
  // Stroke
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  strokeOpacity: number;
  
  // Fill
  fill?: string;
  fillOpacity?: number;
  
  // Handles
  handleFill: string;
  handleStroke: string;
  handleSize: number;
  handleStrokeWidth: number;
  
  // Selection
  selectedStroke: string;
  selectedStrokeWidth: number;
  
  // Hover
  hoverFill: string;
  hoverStroke: string;
  hoverStrokeWidth: number;
  
  // Text-specific
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
}

export interface Theme {
  shapes: ShapeStyle;
}

export const lightTheme: Theme = {
  shapes: {
    stroke: '#000000',
    strokeWidth: 2,
    strokeOpacity: 1,
    fill: 'transparent',
    fillOpacity: 0.1,
    handleFill: '#ffffff',
    handleStroke: '#000000',
    handleSize: 8,
    handleStrokeWidth: 1,
    selectedStroke: '#4a90e2',
    selectedStrokeWidth: 3,
    hoverFill: '#ffffff',
    hoverStroke: '#4a90e2',
    hoverStrokeWidth: 2,
    fontFamily: 'Arial, sans-serif',
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'normal'
  }
};

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

interface StyleManagerEvents {
  themeChanged: { theme: Theme };
  styleChanged: { id: string; style: Partial<ShapeStyle> };
  styleRemoved: { id: string };
}

export class StyleManager extends EventEmitter<StyleManagerEvents> {
  private currentTheme: Theme;
  private customStyles: Map<string, Partial<ShapeStyle>>;
  private originalStyles: Map<string, ShapeStyle>;

  constructor(theme: Theme = lightTheme) {
    super();
    this.currentTheme = { ...theme };
    this.customStyles = new Map();
    this.originalStyles = new Map();
  }

  setTheme(theme: Theme): void {
    this.currentTheme = { ...theme };
    this.emit('themeChanged', { theme });
  }

  getTheme(): Theme {
    return { ...this.currentTheme };
  }

  setCustomStyle(id: string, style: Partial<ShapeStyle>): void {
    this.customStyles.set(id, { ...style });
    this.emit('styleChanged', { id, style });
  }

  removeCustomStyle(id: string): void {
    this.customStyles.delete(id);
    this.emit('styleRemoved', { id });
  }

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

  storeOriginalStyle(id: string, style: ShapeStyle): void {
    if (!this.originalStyles.has(id)) {
      this.originalStyles.set(id, { ...style });
    }
  }

  restoreOriginalStyle(id: string): ShapeStyle {
    const original = this.originalStyles.get(id);
    if (original) {
      this.originalStyles.delete(id);
      return { ...original };
    }
    return this.getStyle(id);
  }

  applySelectionStyle(id: string): ShapeStyle {
    const currentStyle = this.getStyle(id);
    this.storeOriginalStyle(id, currentStyle);
    
    return this.getMergedStyle(id, {
      stroke: this.currentTheme.shapes.selectedStroke,
      strokeWidth: this.currentTheme.shapes.selectedStrokeWidth + 1
    });
  }

  applyHoverStyle(id: string): ShapeStyle {
    return this.getMergedStyle(id, {
      fill: this.currentTheme.shapes.hoverFill,
      stroke: this.currentTheme.shapes.hoverStroke,
      strokeWidth: this.currentTheme.shapes.hoverStrokeWidth
    });
  }

  createSVGStyles(): string {
    const { shapes } = this.currentTheme;
    return `
      .annotation-shape {
        stroke: ${shapes.stroke};
        stroke-width: ${shapes.strokeWidth};
        stroke-opacity: ${shapes.strokeOpacity};
        fill: ${shapes.fill || 'transparent'};
        fill-opacity: ${shapes.fillOpacity || 0};
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
        cursor: pointer;
      }
      
      .annotation-handle:hover {
        fill: ${shapes.hoverFill};
        stroke: ${shapes.hoverStroke};
      }
      
      .annotation-text {
        font-family: ${shapes.fontFamily || 'Arial, sans-serif'};
        font-size: ${shapes.fontSize || 14}px;
        font-weight: ${shapes.fontWeight || 'normal'};
        font-style: ${shapes.fontStyle || 'normal'};
        fill: ${shapes.stroke};
        dominant-baseline: middle;
        text-anchor: middle;
      }
    `;
  }

  clearAllStyles(): void {
    this.customStyles.clear();
    this.originalStyles.clear();
  }

  destroy(): void {
    this.clearAllStyles();
    this.removeAllListeners();
  }
}
