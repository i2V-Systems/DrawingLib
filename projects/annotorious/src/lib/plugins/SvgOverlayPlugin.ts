import OpenSeadragon from 'openseadragon';

export interface SvgOverlayConfig {
  /** Custom CSS class for the SVG element */
  className?: string;
  /** Whether to enable click handling on SVG elements */
  enableClickHandling?: boolean;
  /** Custom transform function for the SVG overlay */
  customTransform?: (viewport: OpenSeadragon.Viewport, containerSize: OpenSeadragon.Point) => string;
}

export interface SvgOverlayInfo {
  /** Get the SVG element */
  svg(): SVGSVGElement;
  /** Get the main group node for adding elements */
  node(): SVGGElement;
  /** Manually trigger a resize/redraw */
  resize(): void;
  /** Add click handler to an SVG element */
  onClick(element: SVGElement, handler: (event: OpenSeadragon.MouseTrackerEvent) => void): void;
  /** Remove the overlay and clean up */
  destroy(): void;
}

declare module 'openseadragon' {
  interface Viewer {
    svgOverlay(config?: SvgOverlayConfig): SvgOverlayInfo;
    _svgOverlayInfo?: SvgOverlayInfo;
  }
}

/**
 * SVG Overlay Plugin for OpenSeadragon
 * 
 * This plugin provides a scalable SVG overlay that automatically
 * transforms with the OpenSeadragon viewport, making it perfect
 * for annotations and other vector graphics that need to scale
 * and rotate with the image.
 */
export class SvgOverlayPlugin {
  private static readonly SVG_NS = 'http://www.w3.org/2000/svg';
  
  /**
   * Install the plugin into OpenSeadragon
   */
  static install(): void {
    if (!OpenSeadragon) {
      throw new Error('OpenSeadragon is required but not found');
    }

    // Check if already installed
    if ((OpenSeadragon.Viewer.prototype as any).svgOverlay) {
      return;
    }

    // Add the svgOverlay method to OpenSeadragon.Viewer prototype
    OpenSeadragon.Viewer.prototype.svgOverlay = function(config?: SvgOverlayConfig): SvgOverlayInfo {
      if (this._svgOverlayInfo) {
        return this._svgOverlayInfo;
      }

      this._svgOverlayInfo = new SvgOverlay(this, config);
      return this._svgOverlayInfo;
    };
  }

  /**
   * Uninstall the plugin from OpenSeadragon
   */
  static uninstall(): void {
    if (OpenSeadragon) {
      (OpenSeadragon.Viewer.prototype as any).svgOverlay = undefined;
    }
  }
}

/**
 * Internal SVG Overlay implementation
 */
class SvgOverlay implements SvgOverlayInfo {
  private readonly _viewer: OpenSeadragon.Viewer;
  private readonly _config: SvgOverlayConfig;
  private readonly _svg: SVGSVGElement;
  private readonly _node: SVGGElement;
  private readonly _containerWidth: number = 0;
  private readonly _containerHeight: number = 0;
  private readonly _eventHandlers: Array<{ event: string; handler: () => void }> = [];

  constructor(viewer: OpenSeadragon.Viewer, config: SvgOverlayConfig = {}) {
    this._viewer = viewer;
    this._config = {
      enableClickHandling: true,
      ...config
    };

    // Create SVG element
    this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    this._svg.style.position = 'absolute';
    this._svg.style.left = '0';
    this._svg.style.top = '0';
    this._svg.style.width = '100%';
    this._svg.style.height = '100%';
    this._svg.style.pointerEvents = 'all';
    
    if (this._config.className) {
      this._svg.setAttribute('class', this._config.className);
    }

    // Add to viewer canvas
    this._viewer.canvas.appendChild(this._svg);

    // Create main group node
    this._node = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement;
    this._svg.appendChild(this._node);

    // Set up event handlers
    this._setupEventHandlers();

    // Initial resize
    this.resize();
  }

  /**
   * Get the SVG element
   */
  svg(): SVGSVGElement {
    return this._svg;
  }

  /**
   * Get the main group node for adding elements
   */
  node(): SVGGElement {
    return this._node;
  }

  /**
   * Manually trigger a resize/redraw
   */
  resize(): void {
    const container = this._viewer.container;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Update SVG dimensions if needed
    if (this._containerWidth !== containerWidth) {
      this._svg.setAttribute('width', containerWidth.toString());
    }

    if (this._containerHeight !== containerHeight) {
      this._svg.setAttribute('height', containerHeight.toString());
    }

    // Calculate transform
    const transform = this._calculateTransform();
    this._node.setAttribute('transform', transform);
  }

  /**
   * Add click handler to an SVG element
   */
  onClick(element: SVGElement, handler: (event: OpenSeadragon.MouseTrackerEvent) => void): void {
    if (!this._config.enableClickHandling) {
      console.warn('Click handling is disabled in SVG overlay config');
      return;
    }

    new OpenSeadragon.MouseTracker({
      element: element,
      clickHandler: handler
    }).setTracking(true);
  }

  /**
   * Remove the overlay and clean up
   */
  destroy(): void {
    // Remove event handlers
    this._eventHandlers.forEach(({ event, handler }) => {
      this._viewer.removeHandler(event as any, handler);
    });

    // Remove SVG element
    if (this._svg.parentNode) {
      this._svg.parentNode.removeChild(this._svg);
    }

    // Clear reference
    (this._viewer as any)._svgOverlayInfo = null;
  }

  /**
   * Set up OpenSeadragon event handlers
   */
  private _setupEventHandlers(): void {
    const events = [
      'animation',
      'open',
      'rotate',
      'flip',
      'resize',
      'update-viewport'
    ] as const;

    events.forEach(event => {
      const handler = () => this.resize();
      this._viewer.addHandler(event, handler);
      this._eventHandlers.push({ event, handler });
    });
  }

  /**
   * Calculate the transform string for the SVG overlay
   */
  private _calculateTransform(): string {
    if (this._config.customTransform) {
      const containerSize = new OpenSeadragon.Point(
        this._viewer.container.clientWidth,
        this._viewer.container.clientHeight
      );
      return this._config.customTransform(this._viewer.viewport, containerSize);
    }

    const viewport = this._viewer.viewport;
    const p = viewport.pixelFromPoint(new OpenSeadragon.Point(0, 0), true);
    const zoom = viewport.getZoom(true);
    const rotation = viewport.getRotation();
    const flipped = viewport.getFlip();

    // Get container size (using private API as mentioned in original code)
    const containerSizeX = (viewport as any)._containerInnerSize?.x || this._viewer.container.clientWidth;
    let scaleX = containerSizeX * zoom;
    let scaleY = scaleX;

    if (flipped) {
      // Makes the x component of the scale negative to flip the svg
      scaleX = -scaleX;
      // Translates svg back into the correct coordinates when the x scale is made negative.
      p.x = -p.x + containerSizeX;
    }

    return `translate(${p.x},${p.y}) scale(${scaleX},${scaleY}) rotate(${rotation})`;
  }
}

// Export for manual installation
export default SvgOverlayPlugin; 