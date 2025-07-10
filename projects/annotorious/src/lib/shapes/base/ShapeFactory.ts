import { BaseShape } from './BaseShape';
import { RectangleShape } from '../RectangleShape';
import { PolygonShape } from '../PolygonShape';
import { CircleShape } from '../CircleShape';
import { EllipseShape } from '../EllipseShape';
import { TextShape } from '../TextShape';
import { Geometry } from '../types';

export class ShapeFactory {
  /**
   * Create a default shape of the specified type
   */
  static createDefault(id: string, type: string): BaseShape {
    // Create default geometry for each shape type
    let geometry: Geometry;
    switch (type) {
      case 'rectangle':
        geometry = {
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 100,
          height: 100
        };
        break;
      
      case 'circle':
        geometry = {
          type: 'circle',
          cx: 50,
          cy: 50,
          r: 50
        };
        break;
      
      case 'ellipse':
        geometry = {
          type: 'ellipse',
          cx: 50,
          cy: 50,
          rx: 50,
          ry: 30
        };
        break;
      
      case 'polygon':
        geometry = {
          type: 'polygon',
          points: []
        };
        break;
      
      case 'text':
        geometry = {
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 20,
          text: ''
        };
        break;
      
      default:
        throw new Error(`Unsupported shape type: ${type}`);
    }
    
    return ShapeFactory.createFromGeometry(id, geometry);
  }

  /**
   * Create a shape from a geometry object
   */
  static createFromGeometry(id: string, geometry: Geometry): BaseShape {
    switch (geometry.type) {
      case 'rectangle':
        return new RectangleShape(id, geometry);
      
      case 'polygon':
        return new PolygonShape(id, geometry);
      
      case 'circle':
        return new CircleShape(id, geometry);
      
      case 'ellipse':
        return new EllipseShape(id, geometry);
      
      case 'text':
        return new TextShape(id, geometry);
      
      default:
        throw new Error(`Unsupported geometry type: ${(geometry as any).type}`);
    }
  }
}
