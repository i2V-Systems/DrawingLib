export class SVGUtils {
  /**
   * Create an SVG element with the given tag name
   */
  static createElement(tagName: string): SVGElement {
    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
  }

  /**
   * Create an SVG point
   */
  static createPoint(x: number, y: number): DOMPoint {
    const point = (document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement).createSVGPoint();
    point.x = x;
    point.y = y;
    return point;
  }

  /**
   * Get mouse position relative to an SVG element
   */
  static getMousePosition(evt: MouseEvent, svg: SVGSVGElement): { x: number; y: number } {
    const CTM = svg.getScreenCTM();
    if (CTM) {
      const point = svg.createSVGPoint();
      point.x = evt.clientX;
      point.y = evt.clientY;
      const transformed = point.matrixTransform(CTM.inverse());
      return { x: transformed.x, y: transformed.y };
    }
    return { x: 0, y: 0 };
  }
  
  /**
   * Get the center point of an SVG element
   */
  static getCenter(element: SVGGraphicsElement): { x: number; y: number } {
    const bbox = element.getBBox();
    return {
      x: bbox.x + bbox.width / 2,
      y: bbox.y + bbox.height / 2
    };
  }

  /**
   * Transform a point by a matrix
   */
  static transformPoint(point: { x: number; y: number }, matrix: DOMMatrix): { x: number; y: number } {
    const svgPoint = (document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement).createSVGPoint();
    svgPoint.x = point.x;
    svgPoint.y = point.y;
    const transformed = svgPoint.matrixTransform(matrix);
    return { x: transformed.x, y: transformed.y };
  }

  /**
   * Get the rotation angle of an SVG element
   */
  static getRotation(element: SVGGraphicsElement): number {
    const transform = element.getAttribute('transform');
    if (transform) {
      const match = transform.match(/rotate\(([-\d.]+)/);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return 0;
  }

  /**
   * Set the rotation of an SVG element
   */
  static setRotation(element: SVGGraphicsElement, angle: number, cx?: number, cy?: number): void {
    if (typeof cx === 'number' && typeof cy === 'number') {
      element.setAttribute('transform', `rotate(${angle} ${cx} ${cy})`);
    } else {
      const center = this.getCenter(element);
      element.setAttribute('transform', `rotate(${angle} ${center.x} ${center.y})`);
    }
  }

  /**
   * Create an SVG path from points
   */
  static createPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    
    return `M ${points[0].x} ${points[0].y} ` +
      points.slice(1).map(point => `L ${point.x} ${point.y}`).join(' ') +
      (points.length > 2 ? ' Z' : '');
  }

  /**
   * Get the bounding box of multiple points
   */
  static getBoundingBox(points: { x: number; y: number }[]): { x: number; y: number; width: number; height: number } {
    if (points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Check if a point is inside a polygon
   */
  static isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  /**
   * Calculate the distance between two points
   */
  static distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Create an SVG marker element
   */
  static createMarker(id: string, options: {
    width?: number;
    height?: number;
    refX?: number;
    refY?: number;
    color?: string;
  } = {}): SVGMarkerElement {
    const {
      width = 10,
      height = 10,
      refX = 5,
      refY = 5,
      color = 'black'
    } = options;

    const marker = this.createElement('marker') as SVGMarkerElement;
    marker.setAttribute('id', id);
    marker.setAttribute('markerWidth', width.toString());
    marker.setAttribute('markerHeight', height.toString());
    marker.setAttribute('refX', refX.toString());
    marker.setAttribute('refY', refY.toString());
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'userSpaceOnUse');

    const path = this.createElement('path');
    path.setAttribute('d', `M 0 0 L ${width} ${height/2} L 0 ${height} Z`);
    path.setAttribute('fill', color);

    marker.appendChild(path);
    return marker;
  }
}
