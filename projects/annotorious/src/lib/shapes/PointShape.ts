import { BaseShape } from './base/BaseShape';
import { Point, PointGeometry, Geometry } from '../types/shape.types';

export class PointShape extends BaseShape {
  private geometry: PointGeometry;
  private marker: SVGCircleElement;

  constructor(geometry: PointGeometry) {
    // Create SVG group element
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    element.setAttribute('class', 'annotation-point');
    
    // Create unique ID
    const id = crypto.randomUUID();
    
    super(id, element);
    
    this.geometry = geometry;
    
    // Create marker circle
    this.marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.marker.setAttribute('cx', geometry.x.toString());
    this.marker.setAttribute('cy', geometry.y.toString());
    this.marker.setAttribute('r', (geometry.style?.size || 6).toString());
    this.marker.setAttribute('fill', geometry.style?.color || '#FF0000');
    this.marker.setAttribute('stroke', '#fff');
    this.marker.setAttribute('stroke-width', '2');
    
    // Add marker to group
    this.element.appendChild(this.marker);
    
    // If icon is specified, add it
    if (geometry.style?.icon) {
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      icon.setAttribute('x', (geometry.x - 8).toString());
      icon.setAttribute('y', (geometry.y - 8).toString());
      icon.setAttribute('width', '16');
      icon.setAttribute('height', '16');
      icon.setAttribute('href', geometry.style.icon);
      this.element.appendChild(icon);
    }
  }

  override getGeometry(): Geometry {
    return { ...this.geometry };
  }

  override update(geometry: Geometry): void {
    if (geometry.type !== 'point') return;

    this.geometry = geometry as PointGeometry;
    this.marker.setAttribute('cx', geometry.x.toString());
    this.marker.setAttribute('cy', geometry.y.toString());
    
    if (geometry.style?.size) {
      this.marker.setAttribute('r', geometry.style.size.toString());
    }
    
    if (geometry.style?.color) {
      this.marker.setAttribute('fill', geometry.style.color);
    }
  }

  override getBBox(): { x: number; y: number; width: number; height: number } {
    const size = this.geometry.style?.size || 6;
    return {
      x: this.geometry.x - size,
      y: this.geometry.y - size,
      width: size * 2,
      height: size * 2
    };
  }

  /**
   * Override setSelected to handle point-specific selection styling
   */
  override setSelected(selected: boolean): void {
    super.setSelected(selected);
    if (selected) {
      const currentRadius = parseFloat(this.marker.getAttribute('r') || '5');
      this.marker.setAttribute('r', (currentRadius * 1.2).toString());
    } else {
      const size = this.geometry.style?.size || 6;
      this.marker.setAttribute('r', size.toString());
    }
  }

  /**
   * Override setHovered to handle point-specific hover styling
   */
  override setHovered(hovered: boolean): void {
    super.setHovered(hovered);
    if (hovered) {
      const currentRadius = parseFloat(this.marker.getAttribute('r') || '5');
      this.marker.setAttribute('r', (currentRadius * 1.1).toString());
    } else {
      const size = this.geometry.style?.size || 6;
      this.marker.setAttribute('r', size.toString());
    }
  }

  /**
   * Override containsPoint to use circle-specific hit detection
   */
  override containsPoint(point: Point): boolean {
    const { x, y } = this.geometry;
    const size = this.geometry.style?.size || 6;
    const dx = point.x - x;
    const dy = point.y - y;
    return Math.sqrt(dx * dx + dy * dy) <= size;
  }
}
