import { Point, PolylineArrowGeometry } from "../types";
import { ArrowSymbolRenderer } from "../utils/ArrowSymbolRenderer";
import { GeometryUtils } from "../utils/GeometryUtils";
import { BaseShape } from "./base";
export class PolylineArrowShape extends BaseShape {
  private points: Point[] = [];
  private arrows: PolylineArrowGeometry['arrows'] = [];
  private arrowElements: SVGTextElement[] = [];
  private arrowGroup?: SVGGElement;

  constructor(id: string, geometry: PolylineArrowGeometry) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    super(id, group as unknown as SVGGraphicsElement);
    
    this.initializeElements();
    this.update(geometry);
  }

  /**
   * Update shape geometry - Required by BaseShape
   */
  update(geometry: PolylineArrowGeometry): void {
    if (geometry.type !== 'polyline-arrow') {
      throw new Error('Invalid geometry type');
    }
    
    this.points = [...geometry.points];
    this.arrows = [...geometry.arrows];
    this.updatePolyline();
    this.updateArrowSymbols();
    this.updateHandlePositions();
    this.updateOutline();
  }

  /**
   * Get current geometry - Required by BaseShape
   */
  getGeometry(): PolylineArrowGeometry {
    return {
      type: 'polyline-arrow',
      points: [...this.points],
      arrows: [...this.arrows]
    };
  }

  /**
   * Move shape by delta - Required by BaseShape
   */
  override moveBy(deltaX: number, deltaY: number): void {
    this.points = this.points.map(point => ({
      x: point.x + deltaX,
      y: point.y + deltaY
    }));
    this.updatePolyline();
    this.updateArrowSymbols();
    this.emit('geometryChanged', { geometry: this.getGeometry() });
  }

  /**
   * Check if point is contained within shape - Required by BaseShape
   */
  override containsPoint(point: Point): boolean {
    const tol = 5;
    if (!this.points || this.points.length < 2) return false;
    
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];
      
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lengthSq = dx * dx + dy * dy;
      let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq;
      t = Math.max(0, Math.min(1, t));
      
      const projX = a.x + t * dx;
      const projY = a.y + t * dy;
      const dist = Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
      
      if (dist <= tol) return true;
    }
    return false;
  }

  /**
   * Apply styling - Required by BaseShape
   */
  override applyStyle(style: any): void {
    super.applyStyle(style);
    
    // Apply style to arrow symbols
    this.arrowElements.forEach(arrow => {
      arrow.style.fill = style.stroke;
    });
  }

  // EDITOR-SPECIFIC PUBLIC API (Required by EditManager)

  /**
   * Get edit handles - Required by EditManager
   */
  override getEditHandles(): { x: number; y: number; type: string; element: SVGCircleElement }[] {
    return this.handles.map((handle, i) => ({
      x: this.points[i].x,
      y: this.points[i].y,
      type: 'vertex',
      element: handle
    }));
  }

  /**
   * Update shape from handle position - Required by EditManager
   */
  updateFromHandle(handle: SVGCircleElement, newPosition: Point): void {
    const idx = this.handles.indexOf(handle);
    if (idx === -1) return;
    
    this.points[idx] = { x: newPosition.x, y: newPosition.y };
    this.updatePolyline();
    this.updateArrowSymbols();
    this.updateHandlePositions();
  }

  // PRIVATE IMPLEMENTATION METHODS

  private initializeElements(): void {
    // Create the base polyline
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('class', 'annotation-shape');
    polyline.setAttribute('fill', 'none');
    this.rootGroup.appendChild(polyline);
    
    // Create arrow group for the Unicode symbols
    this.arrowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.arrowGroup.setAttribute('class', 'polyline-arrow-symbols');
    this.rootGroup.appendChild(this.arrowGroup);
  }

  private updatePolyline(): void {
    const polyline = this.rootGroup.querySelector('polyline');
    if (polyline && this.points.length > 0) {
      const pointsString = this.points.map(p => `${p.x},${p.y}`).join(' ');
      polyline.setAttribute('points', pointsString);
    }
  }

  private updateArrowSymbols(): void {
    this.clearArrowElements();
    
    // Use GeometryUtils to calculate segment data
    const segmentDataArray = GeometryUtils.calculateSegmentData(this.points, this.arrows);
    
    // Use ArrowSymbolRenderer to create symbols
    segmentDataArray.forEach(segmentData => {
      const symbols = ArrowSymbolRenderer.createSymbolsForSegment(segmentData, {
        fontSize: 36,
        className: 'arrow-symbol'
      });
      
      symbols.forEach(symbol => {
        this.arrowGroup?.appendChild(symbol);
        this.arrowElements.push(symbol);
      });
    });
  }

  private clearArrowElements(): void {
    this.arrowElements.forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    this.arrowElements = [];
  }

  protected override showEditHandles(): void {
    if (this.handles.length === 0) {
      this.handles = this.points.map((pt) => {
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        handle.setAttribute('cx', pt.x.toString());
        handle.setAttribute('cy', pt.y.toString());
        handle.setAttribute('r', '6');
        handle.setAttribute('class', 'a9s-handle');
        this.handlesGroup.appendChild(handle);
        return handle;
      });
    }
    this.updateHandlePositions();
    super.showEditHandles();
  }

  private updateHandlePositions(): void {
    if (this.handles.length !== this.points.length) return;
    this.handles.forEach((handle, i) => {
      handle.setAttribute('cx', this.points[i].x.toString());
      handle.setAttribute('cy', this.points[i].y.toString());
    });
  }

  override updateOutline(): void {
    if (this.selectionOutline && this.points.length > 0) {
      const pointsString = this.points.map(p => `${p.x},${p.y}`).join(' ');
      (this.selectionOutline as SVGPolylineElement).setAttribute('points', pointsString);
    }
  }
}
