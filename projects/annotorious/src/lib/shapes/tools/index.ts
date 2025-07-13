import { PolygonTool } from './PolygonTool';
import { RectangleTool } from './RectangleTool';
import { CircleTool } from './CircleTool';
import { EllipseTool } from './EllipseTool';
import { TextTool } from './TextTool';
import { PointTool } from './PointTool';

import { FreehandTool } from './FreehandTool';
import { Tool } from '../../core/tools/Tool';

export const createTools = (svg: SVGSVGElement, onComplete: (shape: any) => void, groupManager?: any): Tool[] => {
  const tools: Tool[] = [
    new RectangleTool(svg, onComplete),
    new CircleTool(svg, onComplete),
    new EllipseTool(svg, onComplete),
    new TextTool(svg, onComplete),
    new PolygonTool(svg, onComplete),
    new PointTool(svg, onComplete),
    new FreehandTool(svg, onComplete),
  ];

  return tools;
};

// Export individual tools for direct access
export { RectangleTool } from './RectangleTool';
export { CircleTool } from './CircleTool';
export { EllipseTool } from './EllipseTool';
export { TextTool } from './TextTool';
export { PolygonTool } from './PolygonTool';
export { PointTool } from './PointTool';
export { FreehandTool } from './FreehandTool';
