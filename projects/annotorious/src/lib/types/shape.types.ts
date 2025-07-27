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

export interface PolylineArrowGeometry extends BaseGeometry {
  type: 'polyline-arrow';
  points: Point[];
  arrows: {
    startIndex: number;
    endIndex: number;
    direction: 'up' | 'down' | 'both';
  }[];
}


/**
 * Text geometry
 */
export interface TextGeometry extends BaseGeometry {
  type: 'text';
  x: number;
  y: number;
  text: string;
  style?: TextStyle;
}

export interface TextStyle {
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
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
  | PointGeometry
  | PolylineArrowGeometry; 