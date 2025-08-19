import { EventEmitter } from '../events/EventEmitter';

export interface ShapeStyle {
  // Primary style properties (user-configurable)
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  strokeOpacity: number;
  fill?: string;
  fillOpacity?: number;
  arrowStroke?: string; // Specific for arrow shapes
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
    fill: 'none',
    fillOpacity: 0.1,
    baseHandleSize: 4, // Base size, will be computed with strokeWidth
    fontFamily: 'Arial, sans-serif',
    fontSize: 10,
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
    stroke: '#3cd37bff',
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
  private readonly FIXED_ARROW_STROKE = '#000000';

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
    // Get existing custom style or empty object if none exists
    const existingStyle = this.customStyles.get(id) || {};
    // Merge existing style with new style properties
    const mergedStyle = { ...existingStyle, ...style };
    this.customStyles.set(id, mergedStyle);
    this.emit('styleChanged', { id, style: mergedStyle });
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

    const scaleFactor = 1 / this.currentZoom;
    const computedHandleSize = this.computeHandleSize(
      baseStyle.strokeWidth,
      scaleFactor
    );

    // this is to ensure complementary colors are used to highlight text
    // and outlines, improving visibility against the shape's stroke color
    const complementaryColor = this.chooseContrastColor(baseStyle.stroke);

    return {
      ...baseStyle,
      fill: 'none',
      selectionOutlineColor: complementaryColor,
      selectionOutlineWidth:
        baseStyle.strokeWidth + this.FIXED_OUTLINE_WIDTH_OFFSET,
      handleFill: complementaryColor,
      handleStroke: this.FIXED_HANDLE_STROKE,
      labelTextFill: complementaryColor,
      arrowStroke: this.FIXED_ARROW_STROKE,
      handleSize: computedHandleSize,
      fontSize: baseStyle.fontSize,
    };
  }

  private computeHandleSize(strokeWidth: number, scaleFactor: number): number {
    // Handle size relationship: base size + strokeWidth factor, adjusted for zoom
    const baseSize = 6; // Base handle radius
    const strokeFactor = strokeWidth * 0.5; // Handle grows with stroke width
    return (baseSize + strokeFactor) * scaleFactor;
  }

/**
 * Parse any CSS color string to RGB {r, g, b}
 * Supports hex (#aabbcc), rgb(), rgba(), and named colors like "red"
 */
private parseColor(color: string): { r: number; g: number; b: number } {
  // Create temporary element to leverage browser's built-in color parsing
  const el = document.createElement('div');
  el.style.color = color;
  document.body.appendChild(el);
  const computedColor = getComputedStyle(el).color;
  document.body.removeChild(el);

  // Extract RGB values from computed style (format: "rgb(r, g, b)")
  const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10)
    };
  }

  // Fallback to black if parsing fails
  return { r: 0, g: 0, b: 0 };
}

/**
 * Calculate relative luminance according to WCAG guidelines
 */
private luminance(rgb: { r: number; g: number; b: number }): number {
  const a = [rgb.r, rgb.g, rgb.b].map((v) => {
    const chan = v / 255;
    return chan <= 0.03928 ? chan / 12.92 : Math.pow((chan + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Choose black or white text color for maximum contrast
 */
private chooseContrastColor(color: string): string {
  const rgb = this.parseColor(color);
  const lum = this.luminance(rgb);
  return lum > 0.179 ? '#000000' : '#FFFFFF';
}


  // Create styles with proper computed relationships
  createSVGStyles(): string {
    const { shapes } = this.currentTheme;
    return `
            .annotation-shape {
                stroke: ${shapes.stroke};
                stroke-width: ${shapes.strokeWidth}px;
                stroke-opacity: ${shapes.strokeOpacity};
                fill: none;
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
