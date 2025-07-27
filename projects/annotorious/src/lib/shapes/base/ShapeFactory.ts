import { BaseShape } from './BaseShape';
import { RectangleShape } from '../RectangleShape';
import { PolygonShape } from '../PolygonShape';
import { CircleShape } from '../CircleShape';
import { EllipseShape } from '../EllipseShape';
import { TextShape } from '../TextShape';
import { PointShape } from '../PointShape';
import { FreehandShape } from '../FreehandShape';
import { Geometry, PointGeometry, FreehandGeometry, PolylineArrowGeometry } from '../../types/shape.types';
import { PolylineArrowShape } from '../ArrowPolylineShape';

export class ShapeFactory {
  /**
   * Create a default shape of the specified type
   */
  static createDefault(id: string, type: string): BaseShape {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid shape ID provided');
    }

    if (!type || typeof type !== 'string') {
      throw new Error('Invalid shape type provided');
    }

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
          text: '',
          style: {
            fontSize: 16,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            fontStyle: 'normal'
          }
        };
        break;
      
      case 'point':
        geometry = {
          type: 'point',
          x: 0,
          y: 0
        };
        break;
      
      case 'freehand':
        geometry = {
          type: 'freehand',
          points: []
        };
        break;
      
      default:
        throw new Error(`Unsupported shape type: ${type}`);
    }
    
    try {
      return ShapeFactory.createFromGeometry(id, geometry);
    } catch (error) {
      throw new Error(`Failed to create shape of type '${type}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a shape from a geometry object
   */
  static createFromGeometry(id: string, geometry: Geometry): BaseShape {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid shape ID provided');
    }

    if (!geometry || typeof geometry !== 'object') {
      throw new Error('Invalid geometry provided');
    }

    if (!geometry.type || typeof geometry.type !== 'string') {
      throw new Error('Invalid geometry type provided');
    }

    try {
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
        
        case 'point':
          return new PointShape(id, geometry as PointGeometry);
      
        case 'freehand':
          return new FreehandShape(id, geometry as FreehandGeometry);

        case 'polyline-arrow':
          return new PolylineArrowShape(id, geometry as PolylineArrowGeometry);
          
        default:
          throw new Error(`Unsupported geometry type: null`);
      }
    } catch (error) {
      throw new Error(`Failed to create shape from geometry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
