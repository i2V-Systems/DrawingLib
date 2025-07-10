import { PolygonTool } from './PolygonTool';
import { Tool } from '../../core/tools/Tool';

export const createTools = (svg: SVGSVGElement, onComplete: (shape: any) => void): Tool[] => {
  return [
    new PolygonTool(svg, onComplete),
    // Add other tools here as they are implemented
  ];
};
