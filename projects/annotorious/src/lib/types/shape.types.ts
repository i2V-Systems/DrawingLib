/**
 * Point interface
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Base geometry interface
 */
export interface BaseGeometry {
  type: string;
}

/**
 * Rectangle geometry
 */
export interface RectangleGeometry extends BaseGeometry {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Polygon geometry
 */
export interface PolygonGeometry extends BaseGeometry {
  type: 'polygon';
  points: Point[];
}

/**
 * Circle geometry
 */
export interface CircleGeometry extends BaseGeometry {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

/**
 * Ellipse geometry
 */
export interface EllipseGeometry extends BaseGeometry {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/**
 * Freehand geometry
 */
export interface FreehandGeometry extends BaseGeometry {
  type: 'freehand';
  points: Point[];
  smoothing?: number;
}

/**
 * Text geometry
 */
export interface TextGeometry extends BaseGeometry {
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  };
}

/**
 * Point geometry
 */
export interface PointGeometry extends BaseGeometry {
  type: 'point';
  x: number;
  y: number;
  style?: {
    size?: number;
    icon?: string;
    color?: string;
  };
}

/**
 * Union type of all geometries
 */
export type Geometry =
  | RectangleGeometry
  | PolygonGeometry
  | CircleGeometry
  | EllipseGeometry
  | FreehandGeometry
  | TextGeometry
  | PointGeometry; 