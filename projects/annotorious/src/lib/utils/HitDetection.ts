import {
  Geometry,
  LineGeometry,
  Point,
  PolylineArrowGeometry,
  RectangleGeometry,
  TextGeometry,
} from '../types/shape.types';
import { SVGUtils } from './SVGUtils';

export interface HitTestResult {
  hit: boolean;
  distance: number;
  tolerance: number;
}

export class HitDetection {
  private static readonly DEFAULT_TOLERANCE = 10; // pixels

  /**
   * Test if a point hits a polygon (on the boundary or within tolerance)
   */
  static hitTestPolygon(
    point: Point,
    geometry: Geometry,
    tolerance: number = this.DEFAULT_TOLERANCE
  ): HitTestResult {
    if (
      geometry.type !== 'polygon' ||
      !geometry.points ||
      geometry.points.length < 3
    ) {
      return { hit: false, distance: Infinity, tolerance };
    }

    const points = geometry.points;
    // Only check distance to polygon boundary (not inside)
    const distance = this.distanceToPolygonBoundary(point, points);
    return {
      hit: distance <= tolerance,
      distance,
      tolerance,
    };
  }

  /**
   * Test if a point hits a rectangle
   */
  static hitTestRectangle(
    point: Point,
    geometry: Geometry,
    tolerance: number = this.DEFAULT_TOLERANCE
  ): HitTestResult {
    const { x, y, width, height } = geometry as RectangleGeometry;
    // Only check distance to rectangle boundary (not inside)
    const distance = this.distanceToRectangleBoundary(point, {
      x,
      y,
      width,
      height,
    });
    return {
      hit: distance <= tolerance,
      distance,
      tolerance,
    };
  }

  /**
   * Test if a point hits a circle
   */
  static hitTestCircle(
    point: Point,
    geometry: Geometry,
    tolerance: number = this.DEFAULT_TOLERANCE
  ): HitTestResult {
    if (geometry.type !== 'circle') {
      return { hit: false, distance: Infinity, tolerance };
    }

    const { cx, cy, r } = geometry;
    const distance = Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2);

    return {
      hit: Math.abs(distance - r) <= tolerance,
      distance: Math.abs(distance - r),
      tolerance,
    };
  }

  /**
   * Test if a point hits an ellipse
   */
  static hitTestEllipse(
    point: Point,
    geometry: Geometry,
    tolerance: number = this.DEFAULT_TOLERANCE
  ): HitTestResult {
    if (geometry.type !== 'ellipse') {
      return { hit: false, distance: Infinity, tolerance };
    }

    const { cx, cy, rx, ry } = geometry;
    // Normalize point coordinates
    const nx = (point.x - cx) / rx;
    const ny = (point.y - cy) / ry;
    // Only check distance to ellipse border (not inside)
    const distance = Math.abs(nx * nx + ny * ny - 1) * Math.min(rx, ry); // Approximate pixel distance
    return {
      hit: distance <= tolerance,
      distance,
      tolerance,
    };
  }

  /**
   * Test if a point hits a point annotation
   */
  static hitTestPoint(
    point: Point,
    geometry: Geometry,
    tolerance: number = this.DEFAULT_TOLERANCE
  ): HitTestResult {
    if (geometry.type !== 'point') {
      return { hit: false, distance: Infinity, tolerance };
    }
    // No change needed: a point is always a border
    const distance = Math.sqrt(
      (point.x - geometry.x) ** 2 + (point.y - geometry.y) ** 2
    );
    return {
      hit: distance <= tolerance,
      distance,
      tolerance,
    };
  }

  /**
   * Test if a point hits a rectangle
   */
  /**
   * Test if a point hits text (direct text hit, not rectangle bounds)
   */
  static hitTestText(
    point: Point,
    geometry: Geometry,
    tolerance: number = 0
  ): HitTestResult {
    const { x, y, text, style } = geometry as TextGeometry;
    const fontSize = style?.fontSize || 16;
    const fontFamily = style?.fontFamily || 'Arial';

    // Calculate accurate text bounds
    const estimatedWidth = SVGUtils.estimateTextWidth(
      text,
      fontSize,
      fontFamily
    );
    const estimatedHeight = fontSize * 1.2;

    const textBounds = {
      x: x - estimatedWidth / 2,
      y: y - estimatedHeight / 2,
      width: estimatedWidth,
      height: estimatedHeight,
    };

    const distance = this.distanceToTextBounds(point, textBounds, fontSize);

    return {
      hit: distance <= tolerance,
      distance,
      tolerance,
    };
  }

  /**
   * Calculate distance from point to text bounds
   */
  private static distanceToTextBounds(
    point: Point,
    bounds: { x: number; y: number; width: number; height: number },
    fontSize: number
  ): number {
    const { x, y, width, height } = bounds;

    // Create a smaller "core" area that represents the actual text more accurately
    const padding = fontSize * 0.1; // 10% of font size as padding
    const coreX = x + padding;
    const coreY = y + padding;
    const coreWidth = width - padding * 2;
    const coreHeight = height - padding * 2;

    // If point is in the core text area, it's a direct hit
    if (
      point.x >= coreX &&
      point.x <= coreX + coreWidth &&
      point.y >= coreY &&
      point.y <= coreY + coreHeight
    ) {
      return 0;
    }

    // Calculate distance to the core area (not the full bounds)
    const dx = Math.max(coreX - point.x, 0, point.x - (coreX + coreWidth));
    const dy = Math.max(coreY - point.y, 0, point.y - (coreY + coreHeight));

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Generic hit test that determines the best method based on geometry type
   */
  static hitTest(
    point: Point,
    geometry: Geometry,
    tolerance: number = this.DEFAULT_TOLERANCE
  ): HitTestResult {
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
      case 'text':
        return this.hitTestText(point, geometry, tolerance);
      case 'polyline-arrow':
        return this.hitTestPolyline(point, geometry, tolerance);
      case 'line':
        return this.hitTestLine(point, geometry, tolerance);

      default:
        return { hit: false, distance: Infinity, tolerance };
    }
  }

  /**
   * Calculate distance from point to polygon boundary
   */
  private static distanceToPolygonBoundary(
    point: Point,
    polygon: Point[]
  ): number {
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
  private static distanceToLineSegment(
    point: Point,
    lineStart: Point,
    lineEnd: Point
  ): number {
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
  private static distanceToRectangleBoundary(
    point: Point,
    rect: { x: number; y: number; width: number; height: number }
  ): number {
    const { x, y, width, height } = rect;

    // Calculate distance to each edge
    const left = Math.abs(point.x - x);
    const right = Math.abs(point.x - (x + width));
    const top = Math.abs(point.y - y);
    const bottom = Math.abs(point.y - (y + height));

    // Find minimum distance to any edge
    return Math.min(left, right, top, bottom);
  }

  /**
   * Hit detection for lines (single line segment)
   * Tests if a point is within tolerance distance of the line segment
   */
  static hitTestLine(
    point: Point,
    geometry: Geometry,
    tolerance: number = 5
  ): HitTestResult {
    const lineGeometry = geometry as LineGeometry;
    const points = lineGeometry.points;

    if (!points || points.length !== 2) {
      return { hit: false, distance: Infinity, tolerance };
    }

    const [startPoint, endPoint] = points;

    // Use the same pointToLineSegmentDistance method as polyline
    const result = this.pointToLineSegmentDistance(point, startPoint, endPoint);

    const hit = result.distance <= tolerance;
    return {
      hit,
      distance: result.distance,
      tolerance,
    };
  }

  /**
   * Hit detection for polylines (open paths)
   * Tests if a point is within tolerance distance of any line segment
   */
  static hitTestPolyline(
    point: Point,
    geometry: Geometry,
    tolerance: number = 5
  ): HitTestResult {
    const points = (geometry as PolylineArrowGeometry).points;
    if (!points || points.length < 2) {
      return { hit: false, distance: Infinity, tolerance };
    }

    let minDistance = Infinity;
    let hitSegmentIndex = -1;

    // Test each line segment
    for (let i = 0; i < points.length - 1; i++) {
      const segmentStart = points[i];
      const segmentEnd = points[i + 1];

      const result = this.pointToLineSegmentDistance(
        point,
        segmentStart,
        segmentEnd
      );

      if (result.distance < minDistance) {
        minDistance = result.distance;
        hitSegmentIndex = i;
      }
    }

    const hit = minDistance <= tolerance;
    return {
      hit,
      distance: minDistance,
      tolerance,
    };
  }

  /**
   * Calculate distance from a point to a line segment
   */
  private static pointToLineSegmentDistance(
    point: Point,
    segmentStart: Point,
    segmentEnd: Point
  ): { distance: number; closestPoint: Point } {
    const dx = segmentEnd.x - segmentStart.x;
    const dy = segmentEnd.y - segmentStart.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      // Degenerate segment (start == end)
      const distance = Math.sqrt(
        (point.x - segmentStart.x) ** 2 + (point.y - segmentStart.y) ** 2
      );
      return { distance, closestPoint: segmentStart };
    }

    // Project point onto the line segment
    let t =
      ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) /
      lengthSquared;

    // Clamp t to [0, 1] to stay within the segment
    t = Math.max(0, Math.min(1, t));

    // Find the closest point on the segment
    const closestPoint = {
      x: segmentStart.x + t * dx,
      y: segmentStart.y + t * dy,
    };

    // Calculate distance from point to closest point on segment
    const distance = Math.sqrt(
      (point.x - closestPoint.x) ** 2 + (point.y - closestPoint.y) ** 2
    );

    return { distance, closestPoint };
  }
}
