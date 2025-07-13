import { BaseShape } from './base/BaseShape';
import { Geometry, FreehandGeometry } from '../types/shape.types';

export class FreehandShape extends BaseShape {
  private geometry: FreehandGeometry;
  private pathElement: SVGPathElement;

  constructor(id: string, geometry: Geometry) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    super(id, path);
    this.pathElement = path;
    this.geometry = geometry as FreehandGeometry;
    this.update(geometry);
  }

  update(geometry: Geometry): void {
    if (geometry.type !== 'freehand') {
      throw new Error('Invalid geometry type for FreehandShape');
    }

    this.geometry = geometry as FreehandGeometry;
    this.updatePath();
  }

  getGeometry(): Geometry {
    return { ...this.geometry };
  }

  private updatePath(): void {
    if (this.geometry.points && this.geometry.points.length > 0) {
      const pathData = this.geometry.points.map((point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${command} ${point.x} ${point.y}`;
      }).join(' ');
      
      // Close the path if it has enough points
      if (this.geometry.points.length > 2) {
        this.pathElement.setAttribute('d', `${pathData} Z`);
      } else {
        this.pathElement.setAttribute('d', pathData);
      }
    }
  }

  override getBBox(): { x: number; y: number; width: number; height: number } {
    if (!this.geometry.points || this.geometry.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const xs = this.geometry.points.map(p => p.x);
    const ys = this.geometry.points.map(p => p.y);

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

  override containsPoint(point: { x: number; y: number }): boolean {
    if (!this.geometry.points || this.geometry.points.length < 3) {
      return false;
    }

    // Use ray casting algorithm for polygon containment
    let inside = false;
    const n = this.geometry.points.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = this.geometry.points[i].x;
      const yi = this.geometry.points[i].y;
      const xj = this.geometry.points[j].x;
      const yj = this.geometry.points[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) && 
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }
} 