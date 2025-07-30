import { Point } from "../types";

export class ArrowSymbolRenderer {
  private static readonly ARROW_SYMBOLS = {
    up: '⬆',
    down: '⬇',
    both: '↕'
  } as const;

  /**
   * Create SVG text element for arrow symbol with proper rotation and data attributes
   */
  static createArrowSymbol(
    position: Point, 
    symbol: string, 
    segmentAngle: number,
    startIndex: number,
    endIndex: number,
    direction: string,
    config: {
      fontSize?: number;
      className?: string;
      fill?: string;
    } = {}
  ): SVGTextElement {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    
    text.textContent = symbol;
    text.setAttribute('x', position.x.toString());
    text.setAttribute('y', position.y.toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', (config.fontSize || 30).toString());
    text.setAttribute('fill', config.fill || 'currentColor');
    text.setAttribute('class', config.className || 'arrow-symbol');
    
    // Add data attributes for segment identification
    text.setAttribute('data-start-index', startIndex.toString());
    text.setAttribute('data-end-index', endIndex.toString());
    text.setAttribute('data-direction', direction);
    
    // Apply rotation to align with segment
    const rotationDegrees = (segmentAngle * 180 / Math.PI);
    text.setAttribute('transform', `rotate(${rotationDegrees} ${position.x} ${position.y})`);
    
    // Enable pointer events for clicking (remove the none setting)
    text.style.pointerEvents = 'auto';
    text.style.userSelect = 'none';
    
    return text;
  }

  /**
   * Create arrow symbols for a segment based on direction with proper rotation and data attributes
   */
  static createSymbolsForSegment(
    segmentData: {
      startIndex: number;
      endIndex: number;
      midPoint: Point;
      perpendicularPoint?: Point;
      perpendicularPoints?: Point[];
      direction: string;
      segmentAngle: number;
    },
    config?: { fontSize?: number; className?: string; fill?: string }
  ): SVGTextElement[] {
    const symbols: SVGTextElement[] = [];
    const { startIndex, endIndex, direction } = segmentData;

    if (direction === 'both' && segmentData.perpendicularPoints) {
      // For 'both' direction, create one symbol that shows both directions
      symbols.push(
        this.createArrowSymbol(
          segmentData.midPoint, 
          this.ARROW_SYMBOLS.both, 
          segmentData.segmentAngle,
          startIndex,
          endIndex,
          'both',
          config
        )
      );
    } else if (direction === 'up') {
      symbols.push(
        this.createArrowSymbol(
          segmentData.midPoint, 
          this.ARROW_SYMBOLS.up, 
          segmentData.segmentAngle,
          startIndex,
          endIndex,
          'up',
          config
        )
      );
    } else if (direction === 'down') {
      symbols.push(
        this.createArrowSymbol(
          segmentData.midPoint, 
          this.ARROW_SYMBOLS.down, 
          segmentData.segmentAngle,
          startIndex,
          endIndex,
          'down',
          config
        )
      );
    }

    return symbols;
  }
}
