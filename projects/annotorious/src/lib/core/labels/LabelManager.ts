import { EventEmitter } from '../events/EventEmitter';
import { Point } from '../../shapes/types';
// import labelStyles from './label.css?inline';

interface LabelManagerEvents {
  labelSet: { id: string; options: LabelOptions };
  labelRemoved: { id: string };
  labelMoved: { id: string; position: Point };
  labelVisibility: { id: string; visible: boolean };
  labelClicked: { id: string };
}

export interface LabelOptions {
  text: string;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
  maxWidth?: number;
}

export interface LabelState {
  visible: boolean;
  position: Point;
  text: string;
}

/**
 * Manages annotation labels
 */
export class LabelManager extends EventEmitter<LabelManagerEvents> {
  private svg: SVGSVGElement;
  private labels: Map<string, SVGGElement>;
  private states: Map<string, LabelState>;
  private defaultOptions: Partial<LabelOptions>;
  private dragTarget: { id: string; startX: number; startY: number; offsetX: number; offsetY: number } | null = null;

  constructor(svg: SVGSVGElement, defaultOptions: Partial<LabelOptions> = {}) {
    super();
    
    this.svg = svg;
    this.labels = new Map();
    this.states = new Map();
    this.defaultOptions = {
      position: 'top',
      offset: 8,
      maxWidth: 200,
      ...defaultOptions
    };

    // Import styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = ''; // All usage of labelStyles removed or commented out
    document.head.appendChild(styleSheet);

    // Add drag event listeners to SVG
    this.svg.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.svg.addEventListener('mouseup', this.onMouseUp.bind(this));
    // Add touch event listeners for mobile support
    this.svg.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.svg.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  /**
   * Create or update a label
   */
  setLabel(id: string, options: LabelOptions): void {
    const opts = { ...this.defaultOptions, ...options };
    let labelGroup = this.labels.get(id);

    if (!labelGroup) {
      // Create new label group
      labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      labelGroup.setAttribute('class', 'annotorious-label-group');
      labelGroup.setAttribute('data-position', opts.position || 'top');
      this.svg.appendChild(labelGroup);
      this.labels.set(id, labelGroup);

      // Add mousedown event for dragging
      labelGroup.addEventListener('mousedown', (evt: MouseEvent) => this.onMouseDown(evt, id));
      // Add touchstart event for dragging
      labelGroup.addEventListener('touchstart', (evt: TouchEvent) => this.onTouchStart(evt, id));

      // Add click event for selection
      labelGroup.addEventListener('click', (evt: MouseEvent) => {
        evt.stopPropagation();
        this.emit('labelClicked', { id });
      });
    }

    // Create or update label elements
    this.updateLabelElements(labelGroup, opts);

    // Store state
    this.states.set(id, {
      visible: true,
      position: { x: 0, y: 0 },
      text: opts.text
    });

    this.emit('labelSet', { id, options: opts });
  }

  /**
   * Remove a label
   */
  removeLabel(id: string): void {
    const label = this.labels.get(id);
    if (label) {
      this.svg.removeChild(label);
      this.labels.delete(id);
      this.states.delete(id);
      this.emit('labelRemoved', { id });
    }
  }

  /**
   * Update label position
   */
  updatePosition(id: string, position: Point): void {
    const label = this.labels.get(id);
    const state = this.states.get(id);
    
    if (label && state) {
      state.position = position;
      
      // Calculate label position based on options
      const opts = { ...this.defaultOptions };
      const bbox = label.getBBox();
      let x = position.x;
      let y = position.y;

      switch (opts.position) {
        case 'top':
          y -= bbox.height + (opts.offset || 0);
          break;
        case 'bottom':
          y += opts.offset || 0;
          break;
        case 'left':
          x -= bbox.width + (opts.offset || 0);
          y -= bbox.height / 2;
          break;
        case 'right':
          x += opts.offset || 0;
          y -= bbox.height / 2;
          break;
      }

      // Update transform
      label.setAttribute('transform', `translate(${x}, ${y})`);
      this.emit('labelMoved', { id, position });
    }
  }

  /**
   * Show/hide a label
   */
  setVisible(id: string, visible: boolean): void {
    const label = this.labels.get(id);
    const state = this.states.get(id);
    
    if (label && state) {
      state.visible = true; // Always visible
      label.style.display = 'block';
      label.setAttribute('data-state', visible ? 'selected' : '');
      label.style.pointerEvents = visible ? 'auto' : 'none'; // Enable dragging only when selected
      this.emit('labelVisibility', { id, visible });
    }
  }

  /**
   * Get label state
   */
  getState(id: string): LabelState | undefined {
    return this.states.get(id);
  }

  /**
   * Update label elements
   */
  private updateLabelElements(group: SVGGElement, options: LabelOptions): void {
    // Clear existing content
    while (group.firstChild) {
      group.removeChild(group.firstChild);
    }

    // Create background rectangle
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('class', 'annotorious-label-bg');
    group.appendChild(bg);

    // Create text element
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'annotorious-label-text');
    text.textContent = options.text;
    if (options.className) {
      text.classList.add(options.className);
    }
    group.appendChild(text);

    // Calculate and set dimensions
    const bbox = text instanceof SVGGraphicsElement ? text.getBBox() : new DOMRect(0, 0, 0, 0);
    const padding = 4;
    bg.setAttribute('x', (bbox.x - padding).toString());
    bg.setAttribute('y', (bbox.y - padding).toString());
    bg.setAttribute('width', (bbox.width + padding * 2).toString());
    bg.setAttribute('height', (bbox.height + padding * 2).toString());
  }

  /**
   * Clean up
   */
  private onMouseDown(evt: MouseEvent, id: string): void {
    if (evt.button === 0) { // Left click only
      evt.stopPropagation();
      const label = this.labels.get(id);
      if (label && label.getAttribute('data-state') === 'selected') {
        const bbox = label.getBBox();
        const matrix = label.getScreenCTM();
        if (matrix) {
          const point = this.svg.createSVGPoint();
          point.x = evt.clientX;
          point.y = evt.clientY;
          const svgPoint = point.matrixTransform(matrix.inverse());
          
          this.dragTarget = {
            id,
            startX: svgPoint.x,
            startY: svgPoint.y,
            offsetX: svgPoint.x - bbox.x,
            offsetY: svgPoint.y - bbox.y
          };
        }
      }
    }
  }

  private onMouseMove(evt: MouseEvent): void {
    if (this.dragTarget) {
      evt.stopPropagation();
      const matrix = this.svg.getScreenCTM();
      if (matrix) {
        const point = this.svg.createSVGPoint();
        point.x = evt.clientX;
        point.y = evt.clientY;
        const svgPoint = point.matrixTransform(matrix.inverse());
        
        const dx = svgPoint.x - this.dragTarget.startX;
        const dy = svgPoint.y - this.dragTarget.startY;
        
        const label = this.labels.get(this.dragTarget.id);
        if (label) {
          const x = this.dragTarget.startX + dx - this.dragTarget.offsetX;
          const y = this.dragTarget.startY + dy - this.dragTarget.offsetY;
          label.setAttribute('transform', `translate(${x}, ${y})`);
          
          // Update state
          const state = this.states.get(this.dragTarget.id);
          if (state) {
            state.position = { x, y };
            this.emit('labelMoved', { id: this.dragTarget.id, position: state.position });
          }
        }
      }
    }
  }

  private onMouseUp(): void {
    this.dragTarget = null;
  }

  private onTouchStart(evt: TouchEvent, id: string): void {
    if (evt.touches.length === 1) {
      evt.stopPropagation();
      const touch = evt.touches[0];
      const label = this.labels.get(id);
      if (label && label.getAttribute('data-state') === 'selected') {
        const bbox = label.getBBox();
        const matrix = label.getScreenCTM();
        if (matrix) {
          const point = this.svg.createSVGPoint();
          point.x = touch.clientX;
          point.y = touch.clientY;
          const svgPoint = point.matrixTransform(matrix.inverse());
          this.dragTarget = {
            id,
            startX: svgPoint.x,
            startY: svgPoint.y,
            offsetX: svgPoint.x - bbox.x,
            offsetY: svgPoint.y - bbox.y
          };
        }
      }
    }
  }

  private onTouchMove(evt: TouchEvent): void {
    if (this.dragTarget && evt.touches.length === 1) {
      evt.stopPropagation();
      const touch = evt.touches[0];
      const matrix = this.svg.getScreenCTM();
      if (matrix) {
        const point = this.svg.createSVGPoint();
        point.x = touch.clientX;
        point.y = touch.clientY;
        const svgPoint = point.matrixTransform(matrix.inverse());
        const dx = svgPoint.x - this.dragTarget.startX;
        const dy = svgPoint.y - this.dragTarget.startY;
        const label = this.labels.get(this.dragTarget.id);
        if (label) {
          const x = this.dragTarget.startX + dx - this.dragTarget.offsetX;
          const y = this.dragTarget.startY + dy - this.dragTarget.offsetY;
          label.setAttribute('transform', `translate(${x}, ${y})`);
          // Update state
          const state = this.states.get(this.dragTarget.id);
          if (state) {
            state.position = { x, y };
            this.emit('labelMoved', { id: this.dragTarget.id, position: state.position });
          }
        }
      }
    }
  }

  private onTouchEnd(): void {
    this.dragTarget = null;
  }

  destroy(): void {
    // Remove event listeners
    this.svg.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.svg.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.svg.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.svg.removeEventListener('touchend', this.onTouchEnd.bind(this));
    this.labels.forEach((label, id) => {
      label.removeEventListener('mousedown', (evt: MouseEvent) => this.onMouseDown(evt, id));
      label.removeEventListener('touchstart', (evt: TouchEvent) => this.onTouchStart(evt, id));
      this.removeLabel(id);
    });
  }
}
