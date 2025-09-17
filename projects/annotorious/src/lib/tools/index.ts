export * from './base/Tool';
export * from './FreehandTool';
export * from './PointTool';
export * from './CircleTool';
export * from './EllipseTool';
export * from './PolygonTool';
export * from './RectangleTool';


import { PolygonTool } from './PolygonTool';
import { RectangleTool } from './RectangleTool';
import { CircleTool } from './CircleTool';
import { EllipseTool } from './EllipseTool';
import { PointTool } from './PointTool';
import { FreehandTool } from './FreehandTool';
import { Tool } from './base/Tool';
import { PolylineArrowTool } from './PolylineArrowTool';
import { LineTool } from './LineTool';
export const createTools = (
  svg: SVGSVGElement,
  onComplete: (shape: any) => void,
  imageBounds?: { naturalWidth: number; naturalHeight: number }
): Tool[] => {
  const bounds = imageBounds || { naturalWidth: 0, naturalHeight: 0 };
  const tools: Tool[] = [
    new RectangleTool(svg, onComplete, bounds),
    new CircleTool(svg, onComplete, bounds),
    new EllipseTool(svg, onComplete, bounds),
    new PolygonTool(svg, onComplete, bounds),
    new PointTool(svg, onComplete, bounds),
    new FreehandTool(svg, onComplete, bounds),
    new PolylineArrowTool(svg, onComplete, bounds),
    new LineTool(svg, onComplete, bounds)
  ];

  return tools;
};