import { EventEmitter } from '../events/EventEmitter';

export interface ShapeStyle {
  // Primary style properties (user-configurable)
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  strokeOpacity: number;
  fill?: string;
  fillOpacity?: number;

  // Base handle size (will be computed based on strokeWidth)
  baseHandleSize: number;
  handleSize: number; // Computed based on strokeWidth and zoom
  // Text properties
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;

  // Fixed computed properties (not directly settable)
  readonly selectionOutlineColor: string;
  readonly selectionOutlineWidth: number;
  readonly handleFill: string;
  readonly handleStroke: string;
  readonly labelTextFill: string;
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
    baseHandleSize: 6, // Base size, will be computed with strokeWidth
    fontFamily: 'Arial, sans-serif',
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'normal',
    handleSize: 6, // Will be computed based on strokeWidth
    // Computed properties (readonly)
    selectionOutlineColor: '#4a90e2', // Fixed
    selectionOutlineWidth: 4, // Will be computed as strokeWidth + 2
    handleFill: '#ffffff', // Fixed
    handleStroke: '#000000', // Fixed
    labelTextFill: 'white', // Fixed
  },
};

export const darkTheme: Theme = {
  shapes: {
    ...lightTheme.shapes,
    stroke: '#ffffff',
    handleFill: '#000000',
    handleStroke: '#ffffff',
    selectionOutlineColor: '#4a90e2',
  },
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
  private currentZoom: number = 1;

  // Fixed style constants
  private readonly FIXED_OUTLINE_COLOR = '#4a90e2';
  private readonly FIXED_OUTLINE_WIDTH_OFFSET = 2;
  private readonly FIXED_HANDLE_FILL = '#000000';
  private readonly FIXED_HANDLE_STROKE = '#000000';
  private readonly FIXED_LABEL_TEXT_FILL = 'white';

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

  setCurrentZoom(zoom: number): void {
    this.currentZoom = zoom;
    // this.emit('zoomChanged', { zoom });
  }

  getCurrentZoom(): number {
    return this.currentZoom;
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
    const baseStyle = customStyle
      ? { ...this.currentTheme.shapes, ...customStyle }
      : { ...this.currentTheme.shapes };

    // Apply zoom-independent scaling
    const scaleFactor = 1 / this.currentZoom;

    // Compute handle size based on strokeWidth and zoom
    const computedHandleSize = this.computeHandleSize(
      baseStyle.strokeWidth,
      scaleFactor
    );

    return {
      ...baseStyle,
      // Fixed computed properties
      selectionOutlineColor: this.FIXED_OUTLINE_COLOR,
      selectionOutlineWidth:
        baseStyle.strokeWidth + this.FIXED_OUTLINE_WIDTH_OFFSET,
      handleFill: this.FIXED_HANDLE_FILL,
      handleStroke: this.FIXED_HANDLE_STROKE,
      labelTextFill: this.FIXED_LABEL_TEXT_FILL,

      // Zoom-adjusted properties
      handleSize: computedHandleSize,
      fontSize: baseStyle.fontSize
    };
  }

  private computeHandleSize(strokeWidth: number, scaleFactor: number): number {
    // Handle size relationship: base size + strokeWidth factor, adjusted for zoom
    const baseSize = 6; // Base handle radius
    const strokeFactor = strokeWidth * 0.5; // Handle grows with stroke width
    return (baseSize + strokeFactor) * scaleFactor;
  }

  // Create styles with proper computed relationships
  createSVGStyles(): string {
    const { shapes } = this.currentTheme;
    return `
            .annotation-shape {
                stroke: ${shapes.stroke};
                stroke-width: ${shapes.strokeWidth}px;
                stroke-opacity: ${shapes.strokeOpacity};
                fill: ${shapes.fill || 'transparent'};
                fill-opacity: ${shapes.fillOpacity || 0};
                vector-effect: non-scaling-stroke;
            }

            .selection-outline {
                stroke: ${this.FIXED_OUTLINE_COLOR};
                fill: none;
                vector-effect: non-scaling-stroke;
            }

            .annotation-handle {
                fill: ${this.FIXED_HANDLE_FILL};
                stroke: ${this.FIXED_HANDLE_STROKE};
                stroke-width: 1px;
                vector-effect: non-scaling-stroke;
                cursor: pointer;
            }

            .annotation-handle:hover {
                stroke: ${this.FIXED_OUTLINE_COLOR};
                stroke-width: 2px;
            }

            .annotation-text {
                font-family: ${shapes.fontFamily || 'Arial, sans-serif'};
                fill: ${this.FIXED_LABEL_TEXT_FILL};
                dominant-baseline: middle;
                text-anchor: middle;
            }

            .a9s-label-bbox {
                rx: 2;
                ry: 2;
                vector-effect: non-scaling-stroke;
            }

            .annotation-shape.hover {
                stroke: ${this.FIXED_OUTLINE_COLOR};
            }
        `;
  }

  // Validation method to ensure style consistency
  validateStyle(style: Partial<ShapeStyle>): boolean {
    // Don't allow setting computed properties directly
    const computedProps = [
      'selectionOutlineColor',
      'selectionOutlineWidth',
      'handleFill',
      'handleStroke',
      'labelTextFill',
    ];
    return !computedProps.some((prop) => prop in style);
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
