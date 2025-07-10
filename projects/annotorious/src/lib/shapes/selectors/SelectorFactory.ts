import { BaseSelector } from './BaseSelector';
import { RectangleSelector } from './RectangleSelector';
import { PolygonSelector } from './PolygonSelector';
import { CircleSelector } from './CircleSelector';
import { EllipseSelector } from './EllipseSelector';
import { TextSelector } from './TextSelector';

export class SelectorFactory {
  /**
   * Create a selector by type
   */
  static createSelector(type: string, svg: SVGSVGElement): BaseSelector {
    switch (type.toLowerCase()) {
      case 'rectangle':
        return new RectangleSelector(svg);
      
      case 'polygon':
        return new PolygonSelector(svg);
      
      case 'circle':
        return new CircleSelector(svg);
      
      case 'ellipse':
        return new EllipseSelector(svg);
      
      case 'text':
        return new TextSelector(svg);
      
      default:
        throw new Error(`Unsupported selector type: ${type}`);
    }
  }
}
