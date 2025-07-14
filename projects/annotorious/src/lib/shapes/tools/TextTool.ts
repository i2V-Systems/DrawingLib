import { Tool } from '../../core/tools/Tool';
import { Point } from '../../types/shape.types';
import { ShapeFactory } from '../base/ShapeFactory';
import { RectangleShape } from '../RectangleShape';

export interface TextAnnotationGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextAnnotation {
  type: 'text';
  text: string;
  geometry: TextAnnotationGeometry;
}

export interface TextToolOptions {
  minWidth?: number;
  minHeight?: number;
  defaultFontSize?: number;
  defaultFontFamily?: string;
  defaultColor?: string;
  defaultBackgroundColor?: string;
}

export class TextTool extends Tool {
  override name = 'text';
  override capabilities = {
    supportsMouse: true
  };
  
  private svg: SVGSVGElement;
  private currentShape: RectangleShape | null = null;
  private startPoint: Point | null = null;
  private textElement: SVGTextElement | null = null;
  private onComplete: ((annotation: TextAnnotation) => void) | null = null;
  private options: Required<TextToolOptions>;
  private imageBounds: { naturalWidth: number, naturalHeight: number };

  constructor(
    svg: SVGSVGElement,
    onComplete: (annotation: TextAnnotation) => void,
    imageBounds: { naturalWidth: number, naturalHeight: number },
    options: TextToolOptions = {}
  ) {
    super();
    this.svg = svg;
    this.onComplete = onComplete;
    this.imageBounds = imageBounds;
    this.options = {
      minWidth: 50,
      minHeight: 20,
      defaultFontSize: 14,
      defaultFontFamily: 'Arial, sans-serif',
      defaultColor: '#000000',
      defaultBackgroundColor: '#ffffff',
      ...options
    };
  }

  override activate(): void {
    // Tool is now activated - no need to add event listeners
    // The ToolManager will handle all events and delegate to this tool
  }

  override deactivate(): void {
    this.cleanup();
  }

  override handleMouseDown(point: Point, event: MouseEvent): void {
    if (event.button === 0) { // Left click only
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      this.startPoint = clamped;
      
      // Create initial shape
      this.currentShape = ShapeFactory.createDefault(
        `text-${Date.now()}`,
        'rectangle'
      ) as RectangleShape;
      
      // Add to SVG
      this.svg.appendChild(this.currentShape.getElement());
      
      // Create text element
      this.textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      this.textElement.setAttribute('class', 'annotation-text');
      this.textElement.style.fontSize = `${this.options.defaultFontSize}px`;
      this.textElement.style.fontFamily = this.options.defaultFontFamily;
      this.textElement.style.fill = this.options.defaultColor;
      this.textElement.style.userSelect = 'none';
      this.textElement.style.pointerEvents = 'none';
      this.svg.appendChild(this.textElement);
    }
  }

  override handleMouseMove(point: Point, _event: MouseEvent): void {
    if (this.startPoint && this.currentShape) {
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      // Calculate rectangle dimensions
      const x = Math.min(this.startPoint.x, clamped.x);
      const y = Math.min(this.startPoint.y, clamped.y);
      const width = Math.abs(clamped.x - this.startPoint.x);
      const height = Math.abs(clamped.y - this.startPoint.y);
      
      // Update shape
      this.currentShape.update({ type: 'text', x, y, width, height, text: '' });
      
      // Update text position
      if (this.textElement) {
        this.textElement.setAttribute('x', (x + 4).toString());
        this.textElement.setAttribute('y', (y + this.options.defaultFontSize + 4).toString());
      }
    }
  }

  override handleMouseUp(point: Point, _event: MouseEvent): void {
    if (this.startPoint && this.currentShape) {
      const clamped = (this.constructor as typeof Tool).clampToImageBounds(point, this.imageBounds);
      // Update final position and size
      const x = Math.min(this.startPoint.x, clamped.x);
      const y = Math.min(this.startPoint.y, clamped.y);
      const width = Math.abs(clamped.x - this.startPoint.x);
      const height = Math.abs(clamped.y - this.startPoint.y);
      
      this.currentShape.update({ type: 'text', x, y, width, height, text: '' });
      
      // Only complete if the rectangle has sufficient size
      if (width >= this.options.minWidth && height >= this.options.minHeight) {
        this.promptForText();
      } else {
        this.cleanup();
      }
      
      this.startPoint = null;
    }
  }



  private promptForText(): void {
    // Create text input
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    const textArea = document.createElement('textarea');
    
    // Style text area
    textArea.style.width = '100%';
    textArea.style.height = '100%';
    textArea.style.border = 'none';
    textArea.style.padding = '4px';
    textArea.style.margin = '0';
    textArea.style.fontSize = `${this.options.defaultFontSize}px`;
    textArea.style.fontFamily = this.options.defaultFontFamily;
    textArea.style.color = this.options.defaultColor;
    textArea.style.backgroundColor = this.options.defaultBackgroundColor;
    textArea.style.resize = 'none';
    textArea.style.overflow = 'hidden';
    
    // Position foreign object
    if (this.currentShape) {
      const bbox = this.currentShape.getElement().getBBox();
      foreignObject.setAttribute('x', bbox.x.toString());
      foreignObject.setAttribute('y', bbox.y.toString());
      foreignObject.setAttribute('width', bbox.width.toString());
      foreignObject.setAttribute('height', bbox.height.toString());
    }
    
    // Add to SVG
    foreignObject.appendChild(textArea);
    this.svg.appendChild(foreignObject);
    
    // Focus text area
    textArea.focus();
    
    // Handle text input
    const handleInput = () => {
      if (this.textElement) {
        this.textElement.textContent = textArea.value;
      }
    };
    
    // Handle completion
    const handleComplete = () => {
      const text = textArea.value.trim();
      if (text && this.currentShape) {
        // Remove temporary elements
        this.svg.removeChild(foreignObject);
        if (this.textElement) {
          this.svg.removeChild(this.textElement);
        }
        
        // Complete annotation
        if (this.onComplete) {
          this.onComplete({
            type: 'text',
            text: text,
            geometry: this.currentShape.getGeometry() as TextAnnotationGeometry
          });
        }
        
        this.currentShape = null;
        this.textElement = null;
      } else {
        this.cleanup();
      }
    };
    
    // Add event listeners
    textArea.addEventListener('input', handleInput);
    textArea.addEventListener('blur', handleComplete);
    textArea.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' && !evt.shiftKey) {
        evt.preventDefault();
        handleComplete();
      } else if (evt.key === 'Escape') {
        this.cleanup();
      }
    });
  }

  private cleanup(): void {
    if (this.currentShape) {
      this.currentShape.destroy();
      this.currentShape = null;
    }
    if (this.textElement && this.textElement.parentNode) {
      this.textElement.parentNode.removeChild(this.textElement);
      this.textElement = null;
    }
    this.startPoint = null;
  }




}
