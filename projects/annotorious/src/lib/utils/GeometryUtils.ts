import { Point } from '../types';

// utils/GeometryUtils.ts
export class GeometryUtils {
  static getMidpointAndPerpendicular(
    point1: Point,
    point2: Point,
    direction: 'up' | 'down' | 'both',
    perpendicularLength: number = 20
  ): {
    midpoint: Point;
    perpendicularPoint?: Point;
    perpendicularPoints?: Point[];
    segmentAngle: number; // Add segment angle for arrow rotation
  } {
    const x1 = point1.x;
    const y1 = point1.y;
    const x2 = point2.x;
    const y2 = point2.y;

    // Calculate the midpoint
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const midpoint = { x: midX, y: midY };

    // Calculate the angle of the line between point1 and point2
    const segmentAngle = Math.atan2(y2 - y1, x2 - x1);

    if (direction === 'up') {
      const perpXUp =
        midX + perpendicularLength * Math.cos(segmentAngle - Math.PI / 2);
      const perpYUp =
        midY + perpendicularLength * Math.sin(segmentAngle - Math.PI / 2);
      return {
        midpoint,
        perpendicularPoint: { x: perpXUp, y: perpYUp },
        segmentAngle,
      };
    } else if (direction === 'down') {
      const perpXDown =
        midX + perpendicularLength * Math.cos(segmentAngle + Math.PI / 2);
      const perpYDown =
        midY + perpendicularLength * Math.sin(segmentAngle + Math.PI / 2);
      return {
        midpoint,
        perpendicularPoint: { x: perpXDown, y: perpYDown },
        segmentAngle,
      };
    } else if (direction === 'both') {
      const perpXUp =
        midX + perpendicularLength * Math.cos(segmentAngle - Math.PI / 2);
      const perpYUp =
        midY + perpendicularLength * Math.sin(segmentAngle - Math.PI / 2);
      const perpXDown =
        midX + perpendicularLength * Math.cos(segmentAngle + Math.PI / 2);
      const perpYDown =
        midY + perpendicularLength * Math.sin(segmentAngle + Math.PI / 2);
      return {
        midpoint,
        perpendicularPoints: [
          { x: perpXUp, y: perpYUp },
          { x: perpXDown, y: perpYDown },
        ],
        segmentAngle,
      };
    }

    return { midpoint, segmentAngle };
  }

  static calculateSegmentData(
    points: Point[],
    arrows: Array<{
      startIndex: number;
      endIndex: number;
      direction: 'up' | 'down' | 'both';
    }>
  ): Array<{
    midPoint: Point;
    perpendicularPoint?: Point;
    perpendicularPoints?: Point[];
    direction: string;
    startIndex: number;
    endIndex: number;
    segmentAngle: number; // Include segment angle
  }> {
    return arrows
      .map((arrow) => {
        if (
          arrow.startIndex >= points.length ||
          arrow.endIndex >= points.length
        ) {
          return null;
        }

        const start = points[arrow.startIndex];
        const end = points[arrow.endIndex];
        const result = this.getMidpointAndPerpendicular(
          start,
          end,
          arrow.direction
        );

        return {
          ...result,
          midPoint: result.midpoint,
          direction: arrow.direction,
          startIndex: arrow.startIndex,
          endIndex: arrow.endIndex,
        };
      })
      .filter(Boolean) as Array<{
      midPoint: Point;
      perpendicularPoint?: Point;
      perpendicularPoints?: Point[];
      direction: string;
      startIndex: number;
      endIndex: number;
      segmentAngle: number;
    }>;
  }
}
