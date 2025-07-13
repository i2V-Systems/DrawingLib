import { Geometry, Point } from '../types/shape.types';

export interface HitTestResult {
  hit: boolean;
  distance: number;
  tolerance: number;
}

export class HitDetection {
  private static readonly DEFAULT_TOLERANCE = 5; // pixels

  /**
   * Test if a point hits a polygon (on the boundary or within tolerance)
   */
  static hitTestPolygon(point: Point, geometry: Geometry, tolerance: number = this.DEFAULT_TOLERANCE): HitTestResult {
    if (geometry.type !== 'polygon' || !geometry.points || geometry.points.length < 3) {
      return { hit: false, distance: Infinity, tolerance };
    }

    const points = geometry.points;
    
    // First check if point is inside the polygon
    if (this.isPointInPolygon(point, points)) {
      return { hit: true, distance: 0, tolerance };
    }

    // Then check distance to polygon boundary
    const distance = this.distanceToPolygonBoundary(point, points);
    return {
      hit: distance <= tolerance,
      distance,
      tolerance
    };
  }

  /**
   * Test if a point hits a rectangle
   */
  static hitTestRectangle(point: Point, geometry: Geometry, tolerance: number = this.DEFAULT_TOLERANCE): HitTestResult {
    if (geometry.type !== 'rectangle') {
      return { hit: false, distance: Infinity, tolerance };
    }

    const { x, y, width, height } = geometry;
    
    // Check if point is inside rectangle
    if (point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height) {
      return { hit: true, distance: 0, tolerance };
    }

    // Calculate distance to rectangle boundary
    const distance = this.distanceToRectangleBoundary(point, { x, y, width, height });
    return {
      hit: distance <= tolerance,
      distance,
      tolerance
    };
  }

  /**
   * Test if a point hits a circle
   */
  static hitTestCircle(point: Point, geometry: Geometry, tolerance: number = this.DEFAULT_TOLERANCE): HitTestResult {
    if (geometry.type !== 'circle') {
      return { hit: false, distance: Infinity, tolerance };
    }

    const { cx, cy, r } = geometry;
    const distance = Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2);
    
    return {
      hit: Math.abs(distance - r) <= tolerance,
      distance: Math.abs(distance - r),
      tolerance
    };
  }

  /**
   * Test if a point hits an ellipse
   */
  static hitTestEllipse(point: Point, geometry: Geometry, tolerance: number = this.DEFAULT_TOLERANCE): HitTestResult {
    if (geometry.type !== 'ellipse') {
      return { hit: false, distance: Infinity, tolerance };
    }

    const { cx, cy, rx, ry } = geometry;
    
    // Normalize point coordinates
    const nx = (point.x - cx) / rx;
    const ny = (point.y - cy) / ry;
    
    // Check if point is on ellipse boundary (within tolerance)
    const distance = Math.abs(nx * nx + ny * ny - 1);
    const actualDistance = distance * Math.min(rx, ry); // Approximate pixel distance
    
    return {
      hit: actualDistance <= tolerance,
      distance: actualDistance,
      tolerance
    };
  }

  /**
   * Test if a point hits a point annotation
   */
  static hitTestPoint(point: Point, geometry: Geometry, tolerance: number = this.DEFAULT_TOLERANCE): HitTestResult {
    if (geometry.type !== 'point') {
      return { hit: false, distance: Infinity, tolerance };
    }

    const distance = Math.sqrt((point.x - geometry.x) ** 2 + (point.y - geometry.y) ** 2);
    
    return {
      hit: distance <= tolerance,
      distance,
      tolerance
    };
  }

  /**
   * Generic hit test that determines the best method based on geometry type
   */
  static hitTest(point: Point, geometry: Geometry, tolerance: number = this.DEFAULT_TOLERANCE): HitTestResult {
    switch (geometry.type) {
      case 'polygon':
        return this.hitTestPolygon(point, geometry, tolerance);
      case 'rectangle':
        return this.hitTestRectangle(point, geometry, tolerance);
      case 'circle':
        return this.hitTestCircle(point, geometry, tolerance);
      case 'ellipse':
        return this.hitTestEllipse(point, geometry, tolerance);
      case 'point':
        return this.hitTestPoint(point, geometry, tolerance);
      default:
        return { hit: false, distance: Infinity, tolerance };
    }
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   */
  private static isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    const n = polygon.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) && 
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Calculate distance from point to polygon boundary
   */
  private static distanceToPolygonBoundary(point: Point, polygon: Point[]): number {
    let minDistance = Infinity;
    const n = polygon.length;
    
    for (let i = 0; i < n; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % n];
      
      const distance = this.distanceToLineSegment(point, p1, p2);
      minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
  }

  /**
   * Calculate distance from point to line segment
   */
  private static distanceToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Line segment is actually a point
      return Math.sqrt(A * A + B * B);
    }

    let param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate distance from point to rectangle boundary
   */
  private static distanceToRectangleBoundary(point: Point, rect: { x: number; y: number; width: number; height: number }): number {
    const { x, y, width, height } = rect;
    
    // Calculate distance to each edge
    const left = Math.abs(point.x - x);
    const right = Math.abs(point.x - (x + width));
    const top = Math.abs(point.y - y);
    const bottom = Math.abs(point.y - (y + height));
    
    // Find minimum distance to any edge
    return Math.min(left, right, top, bottom);
  }
} 