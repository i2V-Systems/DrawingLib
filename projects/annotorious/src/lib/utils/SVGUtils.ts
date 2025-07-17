export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export class SVGUtils {
  /**
   * Create an SVG element with the given tag name
   */
  static createElement(tagName: string): SVGElement {
    return document.createElementNS(SVG_NAMESPACE, tagName);
  }

  /**
   * Create an SVG point
   */
  static createPoint(x: number, y: number): DOMPoint {
    const point = (document.createElementNS(SVG_NAMESPACE, 'svg') as SVGSVGElement).createSVGPoint();
    point.x = x;
    point.y = y;
    return point;
  }

  /**
   * Get mouse position relative to an SVG element
   */
  static getMousePosition(evt: PointerEvent, svg: SVGSVGElement): { x: number; y: number } {
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
    const svgPoint = (document.createElementNS(SVG_NAMESPACE, 'svg') as SVGSVGElement).createSVGPoint();
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

  // Additional utility functions from SVG.ts
  /**
   * Get class names from an element
   */
  static getClassNames(el: Element): Set<string> {
    const attr = el.getAttribute('class');
    return attr ? new Set(attr.split(' ')) : new Set();
  }

  /**
   * Add a CSS class to an element
   */
  static addClass(el: Element, className: string): void {
    const classNames = this.getClassNames(el);
    classNames.add(className);
    el.setAttribute('class', Array.from(classNames).join(' '));
  }

  /**
   * Remove a CSS class from an element
   */
  static removeClass(el: Element, className: string): void {
    const classNames = this.getClassNames(el);
    classNames.delete(className);

    if (classNames.size === 0) {
      el.removeAttribute('class');
    } else {
      el.setAttribute('class', Array.from(classNames).join(' '));
    }
  }

  /**
   * Check if an element has a specific CSS class
   */
  static hasClass(el: Element, className: string): boolean {
    return this.getClassNames(el).has(className);
  }

  /**
   * Toggle a CSS class on an element
   */
  static toggleClass(el: Element, className: string): void {
    if (this.hasClass(el, className)) {
      this.removeClass(el, className);
    } else {
      this.addClass(el, className);
    }
  }

  /**
   * Get the bounding box of an SVG element
   */
  static getBBox(element: SVGGraphicsElement): DOMRect {
    return element.getBBox();
  }

  /**
   * Get the screen bounding box of an SVG element
   */
  static getScreenBBox(element: SVGGraphicsElement): DOMRect {
    return element.getBoundingClientRect();
  }

  /**
   * Transform a point from screen coordinates to SVG coordinates
   */
  static screenToSVG(point: { x: number; y: number }, svg: SVGSVGElement): { x: number; y: number } {
    const CTM = svg.getScreenCTM();
    if (!CTM) return point;

    const svgPoint = svg.createSVGPoint();
    svgPoint.x = point.x;
    svgPoint.y = point.y;
    const transformed = svgPoint.matrixTransform(CTM.inverse());
    
    return { x: transformed.x, y: transformed.y };
  }

  /**
   * Transform a point from SVG coordinates to screen coordinates
   */
  static svgToScreen(point: { x: number; y: number }, svg: SVGSVGElement): { x: number; y: number } {
    const CTM = svg.getScreenCTM();
    if (!CTM) return point;

    const svgPoint = svg.createSVGPoint();
    svgPoint.x = point.x;
    svgPoint.y = point.y;
    const transformed = svgPoint.matrixTransform(CTM);
    
    return { x: transformed.x, y: transformed.y };
  }

  /**
   * Set the transform attribute of an SVG element
   */
  static setTransform(element: SVGElement, transform: string): void {
    element.setAttribute('transform', transform);
  }

  /**
   * Get the transform attribute of an SVG element
   */
  static getTransform(element: SVGElement): string {
    return element.getAttribute('transform') || '';
  }

  /**
   * Apply a translation transform to an SVG element
   */
  static translate(element: SVGElement, x: number, y: number): void {
    const currentTransform = this.getTransform(element);
    const newTransform = currentTransform ? `${currentTransform} translate(${x} ${y})` : `translate(${x} ${y})`;
    this.setTransform(element, newTransform);
  }

  /**
   * Apply a scale transform to an SVG element
   */
  static scale(element: SVGElement, sx: number, sy?: number): void {
    const currentTransform = this.getTransform(element);
    const scaleY = sy !== undefined ? sy : sx;
    const newTransform = currentTransform ? `${currentTransform} scale(${sx} ${scaleY})` : `scale(${sx} ${scaleY})`;
    this.setTransform(element, newTransform);
  }

  /**
   * Apply a rotation transform to an SVG element
   */
  static rotate(element: SVGElement, angle: number, cx?: number, cy?: number): void {
    const currentTransform = this.getTransform(element);
    const center = cx !== undefined && cy !== undefined ? ` ${cx} ${cy}` : '';
    const newTransform = currentTransform ? `${currentTransform} rotate(${angle}${center})` : `rotate(${angle}${center})`;
    this.setTransform(element, newTransform);
  }

  /**
   * Create an SVG path from an array of points
   */
  static createPathFromPoints(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    
    const path = points.map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${point.x} ${point.y}`;
    }).join(' ');
    
    // Close the path if it has more than 2 points
    if (points.length > 2) {
      return `${path} Z`;
    }
    
    return path;
  }

  /**
   * Check if two elements overlap
   */
  static elementsOverlap(el1: SVGGraphicsElement, el2: SVGGraphicsElement): boolean {
    const bbox1 = this.getBBox(el1);
    const bbox2 = this.getBBox(el2);
    
    return !(bbox1.x + bbox1.width < bbox2.x ||
             bbox2.x + bbox2.width < bbox1.x ||
             bbox1.y + bbox1.height < bbox2.y ||
             bbox2.y + bbox2.height < bbox1.y);
  }
}
