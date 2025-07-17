import OpenSeadragon from 'openseadragon';

export interface SvgOverlayConfig {
  className?: string;
  enableClickHandling?: boolean;
  customTransform?: (viewport: OpenSeadragon.Viewport, containerSize: OpenSeadragon.Point, imageSize: OpenSeadragon.Point) => string;
  imageWidth?: number;
  imageHeight?: number;
  useNaturalCoordinates?: boolean;
}

export interface ImageFitInfo {
  effectiveWidth: number;
  effectiveHeight: number;
  offsetX: number;
  offsetY: number;
  fitType: 'letterbox' | 'pillarbox' | 'exact';
}

export interface SvgOverlayInfo {
  svg(): SVGSVGElement;
  node(): SVGGElement;
  resize(): void;
  destroy(): void;
  getImageDimensions(): { width: number; height: number };
  screenToImage(screenX: number, screenY: number): { x: number; y: number };
  imageToScreen(imageX: number, imageY: number): { x: number; y: number };
  eventToImage(event: PointerEvent): { x: number; y: number };
  getImageFitInfo(): ImageFitInfo;
}

/**
 * SVG Overlay for OpenSeadragon (core integration)
 */
export class SvgOverlay implements SvgOverlayInfo {
  public static readonly SVG_NS = 'http://www.w3.org/2000/svg';

  private readonly _viewer: OpenSeadragon.Viewer;
  private readonly _config: SvgOverlayConfig;
  private readonly _svg: SVGSVGElement;
  private readonly _node: SVGGElement;
  private _imageWidth: number = 0;
  private _imageHeight: number = 0;
  private readonly _eventHandlers: Array<{ event: string; handler: () => void }> = [];

  constructor(viewer: OpenSeadragon.Viewer, config: SvgOverlayConfig = {}) {
    this._viewer = viewer;
    this._config = {
      enableClickHandling: true,
      useNaturalCoordinates: true,
      ...config
    };

    // Create SVG element
    this._svg = document.createElementNS(SvgOverlay.SVG_NS, 'svg') as SVGSVGElement;
    this._svg.style.position = 'absolute';
    this._svg.style.left = '0';
    this._svg.style.top = '0';
    this._svg.style.width = '100%';
    this._svg.style.height = '100%';
    this._svg.style.pointerEvents = 'all';
    this._svg.style.overflow = 'visible';
    if (this._config.className) {
      this._svg.setAttribute('class', this._config.className);
    }
    this._viewer.canvas.appendChild(this._svg);
    this._node = document.createElementNS(SvgOverlay.SVG_NS, 'g') as SVGGElement;
    this._svg.appendChild(this._node);
    this._initializeImageDimensions();
    this._setupEventHandlers();
    this.resize();
  }

  svg(): SVGSVGElement {
    return this._svg;
  }

  node(): SVGGElement {
    return this._node;
  }

  getImageDimensions(): { width: number; height: number } {
    return {
      width: this._imageWidth,
      height: this._imageHeight
    };
  }

  getImageFitInfo(): ImageFitInfo {
    const containerSize = this._viewer.viewport.getContainerSize();
    return this._calculateImageFit(containerSize);
  }

  private _calculateTransform(): string {
    const viewport = this._viewer.viewport;
    const flipped = viewport.getFlip();
    const rotation = viewport.getRotation();
    // Get the top-left of the image in viewer pixel coordinates
    let p = viewport.pixelFromPoint(new OpenSeadragon.Point(0, 0), true);
    if (flipped) p.x = this._viewer.viewport.getContainerSize().x - p.x;
    const scaleY = this._currentScale();
    const scaleX = flipped ? -scaleY : scaleY;
    // Compose the transform string
    return `translate(${p.x}, ${p.y}) scale(${scaleX}, ${scaleY}) rotate(${rotation})`;
  }

  private _currentScale(): number {
    const containerWidth = this._viewer.viewport.getContainerSize().x;
    const zoom = this._viewer.viewport.getZoom(true);
    return zoom * containerWidth / this._viewer.world.getContentFactor();
  }

  screenToImage(screenX: number, screenY: number): { x: number; y: number } {
    // Convert screen (client) coordinates to SVG coordinates, then to image coordinates
    const pt = this._svg.createSVGPoint();
    pt.x = screenX;
    pt.y = screenY;
    const screenCTM = this._svg.getScreenCTM();
    if (!screenCTM) return { x: 0, y: 0 };
    const svgP = pt.matrixTransform(screenCTM.inverse());
    const gCTM = this._node.getCTM();
    if (!gCTM) return { x: 0, y: 0 };
    const imgP = svgP.matrixTransform(gCTM.inverse());
    return { x: imgP.x, y: imgP.y };
  }

  imageToScreen(imageX: number, imageY: number): { x: number; y: number } {
    // Convert image coordinates to SVG coordinates, then to screen (client) coordinates
    const pt = this._svg.createSVGPoint();
    pt.x = imageX;
    pt.y = imageY;
    const gCTM = this._node.getCTM();
    if (!gCTM) return { x: 0, y: 0 };
    const svgP = pt.matrixTransform(gCTM);
    const screenCTM = this._svg.getScreenCTM();
    if (!screenCTM) return { x: 0, y: 0 };
    const screenP = pt.matrixTransform(screenCTM);
    return { x: screenP.x, y: screenP.y };
  }

  eventToImage(event: PointerEvent): { x: number; y: number } {
    return this.screenToImage(event.clientX, event.clientY);
  }



  resize(): void {
    const container = this._viewer.container;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    this._svg.setAttribute('width', containerWidth.toString());
    this._svg.setAttribute('height', containerHeight.toString());
    if (this._config.useNaturalCoordinates && this._imageWidth > 0 && this._imageHeight > 0) {
      this._svg.setAttribute('viewBox', `0 0 ${this._imageWidth} ${this._imageHeight}`);
    } else {
      this._svg.setAttribute('viewBox', '0 0 1 1');
    }
    const transform = this._calculateTransform();
    this._node.setAttribute('transform', transform);
  }


  destroy(): void {
    this._eventHandlers.forEach(({ event, handler }) => {
      this._viewer.removeHandler(event as any, handler);
    });
    if (this._svg.parentNode) {
      this._svg.parentNode.removeChild(this._svg);
    }
  }

  private _initializeImageDimensions(): void {
    if (this._config.imageWidth && this._config.imageHeight) {
      this._imageWidth = this._config.imageWidth;
      this._imageHeight = this._config.imageHeight;

      return;
    }
    if (this._viewer.isOpen()) {
      this._extractImageDimensions();
    } else {
      this._viewer.addHandler('open', () => {
        this._extractImageDimensions();
        this.resize();
      });
    }
  }

  private _extractImageDimensions(): void {
    try {
      const tiledImage = this._viewer.world.getItemAt(0);
      if (tiledImage && tiledImage.source) {
        const contentSize = tiledImage.getContentSize();
        this._imageWidth = contentSize.x;
        this._imageHeight = contentSize.y;

      } else {
        console.warn('SVG Overlay: Could not determine image dimensions, using fallback 1000x1000');
        this._imageWidth = 1000;
        this._imageHeight = 1000;
      }
    } catch (error) {
      console.warn('SVG Overlay: Error extracting image dimensions:', error);
      this._imageWidth = 1000;
      this._imageHeight = 1000;
    }
  }

  private _calculateImageFit(containerSize: OpenSeadragon.Point): ImageFitInfo {
    const imageAspectRatio = this._imageWidth / this._imageHeight;
    const containerAspectRatio = containerSize.x / containerSize.y;
    const aspectDiff = Math.abs(imageAspectRatio - containerAspectRatio);
    if (aspectDiff < 0.001) {
      return {
        effectiveWidth: containerSize.x,
        effectiveHeight: containerSize.y,
        offsetX: 0,
        offsetY: 0,
        fitType: 'exact'
      };
    } else if (imageAspectRatio > containerAspectRatio) {
      const effectiveHeight = containerSize.x / imageAspectRatio;
      return {
        effectiveWidth: containerSize.x,
        effectiveHeight: effectiveHeight,
        offsetX: 0,
        offsetY: (containerSize.y - effectiveHeight) / 2,
        fitType: 'letterbox'
      };
    } else {
      const effectiveWidth = containerSize.y * imageAspectRatio;
      return {
        effectiveWidth: effectiveWidth,
        effectiveHeight: containerSize.y,
        offsetX: (containerSize.x - effectiveWidth) / 2,
        offsetY: 0,
        fitType: 'pillarbox'
      };
    }
  }

  private _setupEventHandlers(): void {
    const events = [
      'animation',
      'open',
      'rotate',
      'flip',
      'resize',
      'update-viewport',
      'zoom',
      'pan'
    ] as const;
    events.forEach(event => {
      const handler = () => this.resize();
      this._viewer.addHandler(event, handler);
      this._eventHandlers.push({ event, handler });
    });
  }



} 