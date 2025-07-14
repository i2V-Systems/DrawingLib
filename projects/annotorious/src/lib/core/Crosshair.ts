import { EventEmitter } from './events/EventEmitter';

export interface CrosshairConfig {
  enabled?: boolean;
  showOnlyWhenDrawing?: boolean;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
}

export class Crosshair extends EventEmitter {
  private svg: SVGSVGElement;
  private container!: SVGSVGElement;
  private horizontalLine!: SVGLineElement;
  private verticalLine!: SVGLineElement;
  private config: CrosshairConfig;
  private isVisible: boolean = false;
  private isDrawing: boolean = false;

  constructor(svg: SVGSVGElement, config: CrosshairConfig = {}) {
    super();

    this.svg = svg;
    this.config = {
      enabled: true,
      showOnlyWhenDrawing: true,
      color: 'rgba(0, 0, 0, 0.5)',
      strokeWidth: 1,
      opacity: 0.5,
      ...config
    };

    this.createCrosshair();
    this.setupEventListeners();
  }

  private createCrosshair(): void {
    // Create container SVG for crosshair
    this.container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.container.setAttribute('class', 'crosshair');
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '1';

    // Create group for crosshair lines
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'crosshair-group');

    // Create horizontal line
    this.horizontalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.horizontalLine.setAttribute('stroke', this.config.color!);
    this.horizontalLine.setAttribute('stroke-width', this.config.strokeWidth!.toString());
    this.horizontalLine.setAttribute('opacity', this.config.opacity!.toString());
    this.horizontalLine.setAttribute('vector-effect', 'non-scaling-stroke');
    this.horizontalLine.setAttribute('shape-rendering', 'crispEdges');

    // Create vertical line
    this.verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.verticalLine.setAttribute('stroke', this.config.color!);
    this.verticalLine.setAttribute('stroke-width', this.config.strokeWidth!.toString());
    this.verticalLine.setAttribute('opacity', this.config.opacity!.toString());
    this.verticalLine.setAttribute('vector-effect', 'non-scaling-stroke');
    this.verticalLine.setAttribute('shape-rendering', 'crispEdges');

    // Append lines to group
    group.appendChild(this.horizontalLine);
    group.appendChild(this.verticalLine);

    // Append group to container
    this.container.appendChild(group);

    // Append container to SVG parent
    if (this.svg.parentElement) {
      this.svg.parentElement.appendChild(this.container);
    }

    // Initially hide crosshair
    this.hide();
  }

  private setupEventListeners(): void {
    // Listen for mouse movement on the SVG
    this.svg.addEventListener('pointermove', this.onMouseMove.bind(this));
    
    // Also listen on parent element for better coverage
    if (this.svg.parentElement) {
      this.svg.parentElement.addEventListener('pointermove', this.onMouseMove.bind(this));
    }
  }

  private onMouseMove(event: PointerEvent): void {
    if (!this.shouldShow()) {
      return;
    }

    // Get the container's bounding rect for accurate positioning
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.updatePosition(x, y);
  }

  private updatePosition(x: number, y: number): void {
    const width = this.container.clientWidth || this.container.getBoundingClientRect().width;
    const height = this.container.clientHeight || this.container.getBoundingClientRect().height;

    // Update horizontal line
    this.horizontalLine.setAttribute('x1', '0');
    this.horizontalLine.setAttribute('y1', y.toString());
    this.horizontalLine.setAttribute('x2', width.toString());
    this.horizontalLine.setAttribute('y2', y.toString());

    // Update vertical line
    this.verticalLine.setAttribute('x1', x.toString());
    this.verticalLine.setAttribute('y1', '0');
    this.verticalLine.setAttribute('x2', x.toString());
    this.verticalLine.setAttribute('y2', height.toString());
  }

  private shouldShow(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (this.config.showOnlyWhenDrawing && !this.isDrawing) {
      return false;
    }

    return true;
  }

  public show(): void {
    if (this.shouldShow()) {
      this.container.style.display = 'block';
      this.isVisible = true;
    }
  }

  public hide(): void {
    this.container.style.display = 'none';
    this.isVisible = false;
  }

  public setDrawingMode(isDrawing: boolean): void {
    this.isDrawing = isDrawing;
    
    if (this.config.showOnlyWhenDrawing) {
      if (isDrawing) {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  public enable(): void {
    this.config.enabled = true;
    if (this.shouldShow()) {
      this.show();
    }
  }

  public disable(): void {
    this.config.enabled = false;
    this.hide();
  }

  public setConfig(config: Partial<CrosshairConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update visual properties
    if (config.color) {
      this.horizontalLine.setAttribute('stroke', config.color);
      this.verticalLine.setAttribute('stroke', config.color);
    }
    
    if (config.strokeWidth) {
      this.horizontalLine.setAttribute('stroke-width', config.strokeWidth.toString());
      this.verticalLine.setAttribute('stroke-width', config.strokeWidth.toString());
    }
    
    if (config.opacity) {
      this.horizontalLine.setAttribute('opacity', config.opacity.toString());
      this.verticalLine.setAttribute('opacity', config.opacity.toString());
    }
  }

  public isEnabled(): boolean {
    return this.config.enabled!;
  }

  public isDrawingMode(): boolean {
    return this.isDrawing;
  }

  public destroy(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    
    // Remove event listeners
    this.svg.removeEventListener('pointermove', this.onMouseMove.bind(this));
    if (this.svg.parentElement) {
      this.svg.parentElement.removeEventListener('pointermove', this.onMouseMove.bind(this));
    }
  }
} 