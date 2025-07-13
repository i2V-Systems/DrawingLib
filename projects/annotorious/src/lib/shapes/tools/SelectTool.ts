import { Tool } from '../../core/tools/Tool';
import { EventEmitter } from '../../core/events/EventEmitter';
import { Point } from '../../types/shape.types';

export class SelectTool extends EventEmitter implements Tool {
  name = 'select';
  capabilities = {
    supportsMouse: true
  };
  
  private svg: SVGSVGElement;
  private isDragging: boolean = false;
  private dragStartPoint: Point | null = null;
  private selectedElement: SVGGraphicsElement | null = null;

  constructor(svg: SVGSVGElement) {
    super();
    this.svg = svg;
  }

  activate(): void {
    this.svg.style.cursor = 'pointer';
    // Tool is now activated - no need to add event listeners
    // The ToolManager will handle all events and delegate to this tool
  }

  deactivate(): void {
    this.svg.style.cursor = '';
    this.isDragging = false;
    this.dragStartPoint = null;
    this.selectedElement = null;
  }

  handleMouseDown(point: Point, event: MouseEvent): void {
    if (event.button === 0) { // Left click only
      this.dragStartPoint = point;
      
      // Find element at point
      const element = this._getElementAtPoint(point);
      if (element && element.classList.contains('annotation-shape')) {
        this.selectedElement = element;
        this.isDragging = true;
        this.svg.style.cursor = 'move';
        
        // Emit selection event
        this.emit('elementSelected', { element, point });
      }
    }
  }

  handleMouseMove(point: Point, event: MouseEvent): void {
    if (this.isDragging && this.selectedElement && this.dragStartPoint) {
      const deltaX = point.x - this.dragStartPoint.x;
      const deltaY = point.y - this.dragStartPoint.y;
      
      // Update element position
      const currentTransform = this.selectedElement.getAttribute('transform') || '';
      const newTransform = `translate(${deltaX} ${deltaY})`;
      this.selectedElement.setAttribute('transform', newTransform);
      
      // Emit move event
      this.emit('elementMoved', { 
        element: this.selectedElement, 
        deltaX, 
        deltaY, 
        point 
      });
    }
  }

  handleMouseUp(point: Point, event: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.svg.style.cursor = 'pointer';
      
      if (this.selectedElement) {
        // Emit final position
        this.emit('elementMoveEnd', { 
          element: this.selectedElement, 
          point 
        });
      }
    }
    
    this.dragStartPoint = null;
  }

  private _getElementAtPoint(point: Point): SVGGraphicsElement | null {
    // Use document.elementFromPoint to find element at screen coordinates
    const screenPoint = this._svgToScreen(point);
    const element = document.elementFromPoint(screenPoint.x, screenPoint.y);
    
    if (element && this.svg.contains(element)) {
      // Find the closest SVG graphics element
      let svgElement = element as Element;
      while (svgElement && svgElement !== this.svg) {
        if (svgElement instanceof SVGGraphicsElement) {
          return svgElement;
        }
        svgElement = svgElement.parentElement!;
      }
    }
    
    return null;
  }



  private _svgToScreen(point: Point): { x: number; y: number } {
    const rect = this.svg.getBoundingClientRect();
    return {
      x: rect.left + point.x,
      y: rect.top + point.y
    };
  }


} 