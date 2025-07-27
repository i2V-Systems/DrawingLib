import { Point } from "../types";

export class ArrowSymbolRenderer {
  private static readonly ARROW_SYMBOLS = {
    up: '⬆',
    down: '⬇',
    both: '↕'
  } as const;

  /**
   * Create SVG text element for arrow symbol with proper rotation
   */
  static createArrowSymbol(
    position: Point, 
    symbol: string, 
    segmentAngle: number, // Add segment angle parameter
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
    
    // Apply rotation to align with segment
    const rotationDegrees = (segmentAngle * 180 / Math.PI); // +90 to make arrows perpendicular
    text.setAttribute('transform', `rotate(${rotationDegrees} ${position.x} ${position.y})`);
    
    text.style.pointerEvents = 'none';
    text.style.userSelect = 'none';
    
    return text;
  }

  /**
   * Create arrow symbols for a segment based on direction with proper rotation
   */
  static createSymbolsForSegment(
    segmentData: {
      midPoint: Point;
      perpendicularPoint?: Point;
      perpendicularPoints?: Point[];
      direction: string;
      segmentAngle: number; // Include segment angle
    },
    config?: { fontSize?: number; className?: string; fill?: string }
  ): SVGTextElement[] {
    const symbols: SVGTextElement[] = [];

    if (segmentData.direction === 'both' && segmentData.perpendicularPoints) {
      // For 'both' direction, create one symbol that shows both directions
      symbols.push(
        this.createArrowSymbol(
          segmentData.midPoint, 
          this.ARROW_SYMBOLS.both, 
          segmentData.segmentAngle,
          config
        )
      );
    } else {
      // For single direction arrows
      const symbolKey = segmentData.direction as keyof typeof this.ARROW_SYMBOLS;
      const symbolChar = this.ARROW_SYMBOLS[symbolKey] || this.ARROW_SYMBOLS.up;
      symbols.push(
        this.createArrowSymbol(
          segmentData.midPoint, 
          symbolChar, 
          segmentData.segmentAngle,
          config
        )
      );
    }

    return symbols;
  }
}
