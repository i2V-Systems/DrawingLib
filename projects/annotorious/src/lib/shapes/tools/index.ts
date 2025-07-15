import { PolygonTool } from './PolygonTool';
import { RectangleTool } from './RectangleTool';
import { CircleTool } from './CircleTool';
import { EllipseTool } from './EllipseTool';
import { PointTool } from './PointTool';
import { FreehandTool } from './FreehandTool';
import { Tool } from '../../core/tools/Tool';

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
  ];

  return tools;
};

// Export individual tools for direct access
export { RectangleTool } from './RectangleTool';
export { CircleTool } from './CircleTool';
export { EllipseTool } from './EllipseTool';
export { PolygonTool } from './PolygonTool';
export { PointTool } from './PointTool';
export { FreehandTool } from './FreehandTool';
