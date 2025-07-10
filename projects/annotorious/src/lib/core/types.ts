export interface Point {
  x: number;
  y: number;
}

export interface PointGeometry {
  type: 'point';
  x: number;
  y: number;
}

export interface RectangleGeometry {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextGeometry {
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

export type Geometry = PointGeometry | RectangleGeometry | TextGeometry;

export interface Annotation {
  id: string;
  geometry: Geometry;
  target?: string;
  body?: any;
}
