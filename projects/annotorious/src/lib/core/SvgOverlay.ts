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
  eventToImage(event: MouseEvent): { x: number; y: number };
  getImageFitInfo(): ImageFitInfo;
  convertSVGToImageCoords(svgElement: SVGElement): any;
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
  private _containerWidth: number = 0;
  private _containerHeight: number = 0;
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

  screenToImage(screenX: number, screenY: number): { x: number; y: number } {
    const canvasRect = this._viewer.canvas.getBoundingClientRect();
    const windowPoint = new OpenSeadragon.Point(
      screenX - canvasRect.left,
      screenY - canvasRect.top
    );
    const viewportPoint = this._viewer.viewport.windowToViewportCoordinates(windowPoint);
    const imagePoint = this._viewer.viewport.viewportToImageCoordinates(viewportPoint);
    if (this._config.useNaturalCoordinates) {
      return {
        x: imagePoint.x * this._imageWidth,
        y: imagePoint.y * this._imageHeight
      };
    } else {
      return {
        x: imagePoint.x,
        y: imagePoint.y
      };
    }
  }

  imageToScreen(imageX: number, imageY: number): { x: number; y: number } {
    let normalizedX, normalizedY;
    if (this._config.useNaturalCoordinates) {
      normalizedX = imageX / this._imageWidth;
      normalizedY = imageY / this._imageHeight;
    } else {
      normalizedX = imageX;
      normalizedY = imageY;
    }
    const viewportPoint = this._viewer.viewport.imageToViewportCoordinates(normalizedX, normalizedY);
    const windowPoint = this._viewer.viewport.viewportToWindowCoordinates(viewportPoint);
    const canvasRect = this._viewer.canvas.getBoundingClientRect();
    return {
      x: windowPoint.x + canvasRect.left,
      y: windowPoint.y + canvasRect.top
    };
  }

  eventToImage(event: MouseEvent): { x: number; y: number } {
    return this.screenToImage(event.clientX, event.clientY);
  }

  convertSVGToImageCoords(svgElement: SVGElement): any {
    if (!svgElement) return null;
    const tagName = svgElement.tagName.toLowerCase();
    switch (tagName) {
      case 'rect':
        return this._convertRectToImageCoords(svgElement as SVGRectElement);
      case 'circle':
        return this._convertCircleToImageCoords(svgElement as SVGCircleElement);
      case 'polygon':
        return this._convertPolygonToImageCoords(svgElement as SVGPolygonElement);
      case 'polyline':
        return this._convertPolylineToImageCoords(svgElement as SVGPolylineElement);
      case 'line':
        return this._convertLineToImageCoords(svgElement as SVGLineElement);
      default:
        console.warn('Unsupported SVG element type for conversion:', tagName);
        return null;
    }
  }

  resize(): void {
    const container = this._viewer.container;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    this._containerWidth = containerWidth;
    this._containerHeight = containerHeight;
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

  private _calculateTransform(): string {
    if (this._config.customTransform) {
      const containerSize = new OpenSeadragon.Point(
        this._viewer.container.clientWidth,
        this._viewer.container.clientHeight
      );
      const imageSize = new OpenSeadragon.Point(this._imageWidth, this._imageHeight);
      return this._config.customTransform(this._viewer.viewport, containerSize, imageSize);
    }
    const viewport = this._viewer.viewport;
    const rotation = viewport.getRotation();
    const flipped = viewport.getFlip();
    if (this._config.useNaturalCoordinates) {
      // Only apply rotation and flip, no scaling/translation
      let transform = '';
      if (flipped) {
        // Flip horizontally around the center of the image
        transform += `translate(${this._imageWidth},0) scale(-1,1) `;
      }
      if (rotation) {
        // Rotate around the center of the image
        transform += `rotate(${rotation},${this._imageWidth/2},${this._imageHeight/2})`;
      }
      return transform.trim();
    } else {
      const containerSize = viewport.getContainerSize();
      const fitInfo = this._calculateImageFit(containerSize);
      const imageTopLeft = viewport.imageToViewportCoordinates(0, 0);
      const windowTopLeft = viewport.viewportToWindowCoordinates(imageTopLeft);
      const zoom = viewport.getZoom(true);
      let scale = fitInfo.effectiveWidth * zoom;
      let scaleX = scale;
      let scaleY = scale;
      let translateX = windowTopLeft.x + (fitInfo.offsetX * zoom);
      let translateY = windowTopLeft.y + (fitInfo.offsetY * zoom);
      if (flipped) {
        scaleX = -scaleX;
        translateX = -translateX + containerSize.x;
      }
      return `translate(${translateX},${translateY}) scale(${scaleX},${scaleY}) rotate(${rotation})`;
    }
  }

  private _convertRectToImageCoords(rect: SVGRectElement): any {
    const x = parseFloat(rect.getAttribute('x') || '0');
    const y = parseFloat(rect.getAttribute('y') || '0');
    const width = parseFloat(rect.getAttribute('width') || '0');
    const height = parseFloat(rect.getAttribute('height') || '0');
    if (this._config.useNaturalCoordinates) {
      return {
        type: 'rectangle',
        x, y, width, height
      };
    } else {
      return {
        type: 'rectangle',
        x: x * this._imageWidth,
        y: y * this._imageHeight,
        width: width * this._imageWidth,
        height: height * this._imageHeight
      };
    }
  }

  private _convertCircleToImageCoords(circle: SVGCircleElement): any {
    const cx = parseFloat(circle.getAttribute('cx') || '0');
    const cy = parseFloat(circle.getAttribute('cy') || '0');
    const r = parseFloat(circle.getAttribute('r') || '0');
    if (this._config.useNaturalCoordinates) {
      return {
        type: 'circle',
        cx, cy, r
      };
    } else {
      return {
        type: 'circle',
        cx: cx * this._imageWidth,
        cy: cy * this._imageHeight,
        r: r * Math.min(this._imageWidth, this._imageHeight)
      };
    }
  }

  private _convertPolygonToImageCoords(polygon: SVGPolygonElement): any {
    const pointsStr = polygon.getAttribute('points') || '';
    const points = this._parsePointsString(pointsStr);
    if (this._config.useNaturalCoordinates) {
      return {
        type: 'polygon',
        points
      };
    } else {
      return {
        type: 'polygon',
        points: points.map(point => ({
          x: point.x * this._imageWidth,
          y: point.y * this._imageHeight
        }))
      };
    }
  }

  private _convertPolylineToImageCoords(polyline: SVGPolylineElement): any {
    const pointsStr = polyline.getAttribute('points') || '';
    const points = this._parsePointsString(pointsStr);
    if (this._config.useNaturalCoordinates) {
      return {
        type: 'polyline',
        points
      };
    } else {
      return {
        type: 'polyline',
        points: points.map(point => ({
          x: point.x * this._imageWidth,
          y: point.y * this._imageHeight
        }))
      };
    }
  }

  private _convertLineToImageCoords(line: SVGLineElement): any {
    const x1 = parseFloat(line.getAttribute('x1') || '0');
    const y1 = parseFloat(line.getAttribute('y1') || '0');
    const x2 = parseFloat(line.getAttribute('x2') || '0');
    const y2 = parseFloat(line.getAttribute('y2') || '0');
    if (this._config.useNaturalCoordinates) {
      return {
        type: 'line',
        x1, y1, x2, y2
      };
    } else {
      return {
        type: 'line',
        x1: x1 * this._imageWidth,
        y1: y1 * this._imageHeight,
        x2: x2 * this._imageWidth,
        y2: y2 * this._imageHeight
      };
    }
  }

  private _parsePointsString(pointsStr: string): Array<{x: number, y: number}> {
    return pointsStr
      .trim()
      .split(/[\t,]+/)
      .filter(coord => coord.length > 0)
      .reduce((points: Array<{x: number, y: number}>, coord: string, index: number, array: string[]) => {
        if (index % 2 === 0 && index + 1 < array.length) {
          points.push({
            x: parseFloat(coord),
            y: parseFloat(array[index + 1])
          });
        }
        return points;
      }, []);
  }

} 