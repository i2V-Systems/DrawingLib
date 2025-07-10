import { EventEmitter } from '../events/EventEmitter';
import { Annotation } from '../annotation/types';
import { Shape } from '../../shapes/base';
import { StyleManager } from '../style/StyleManager';
import { SpatialIndex, SpatialItem } from './SpatialIndex';

interface AnnotationStateEvents {
  create: { annotation: Annotation };
  update: { id: string; changes: Annotation };
  delete: { id: string };
  select: { id: string };
  deselect: { id: string };
}

export class AnnotationState extends EventEmitter<AnnotationStateEvents> {
  private annotations: Map<string, Annotation>;
  private shapes: Map<string, Shape>;
  private selectedId: string | null;
  private readonly styleManager: StyleManager;
  private readonly spatialIndex: SpatialIndex;


  constructor(styleManager: StyleManager) {
    super();
    this.annotations = new Map();
    this.shapes = new Map();
    this.selectedId = null;
    this.styleManager = styleManager;
    this.spatialIndex = new SpatialIndex();

    // Listen for style changes
    this.styleManager.on('styleChanged', ({ id }) => {
      const shape = this.shapes.get(id);
      if (shape) {
        const style = this.styleManager.getStyle(id);
        shape.applyStyle(style);
      }
    });
  }

  add(annotation: Annotation, shape: Shape): void {
    const id = annotation.id || crypto.randomUUID();
    annotation.id = id;

    this.annotations.set(id, annotation);
    this.shapes.set(id, shape);

    // Add to spatial index
    const bbox = this.getAnnotationBBox(annotation);
    if (bbox) {
      this.spatialIndex.insert({ ...bbox, id });
    }

    // Apply initial style
    const style = this.styleManager.getStyle(id);
    shape.applyStyle(style);

    this.emit('create', { annotation });
  }

  update(id: string, changes: Partial<Annotation>): void {
    const current = this.annotations.get(id);
    if (current) {
      const updated = { ...current, ...changes };
      this.annotations.set(id, updated);

      // Update spatial index if geometry changed
      if (changes.target?.selector?.geometry) {
        const oldBbox = this.getAnnotationBBox(current);
        const newBbox = this.getAnnotationBBox(updated);
        if (oldBbox && newBbox) {
          this.spatialIndex.update({ ...oldBbox, id }, { ...newBbox, id });
        }
      }

      // Update shape if geometry changed
      if (changes.target?.selector?.geometry) {
        const shape = this.shapes.get(id);
        if (shape) {
          shape.update(changes.target.selector.geometry);
          // Reapply style after geometry update
          const style = this.styleManager.getStyle(id);
          shape.applyStyle(style);
        }
      }

      this.emit('update', { id, changes: updated });
    }
  }

  remove(id: string): void {
    const annotation = this.annotations.get(id);
    if (annotation) {
      // Remove from spatial index
      const bbox = this.getAnnotationBBox(annotation);
      if (bbox) {
        this.spatialIndex.remove({ ...bbox, id });
      }

      this.annotations.delete(id);
      
      const shape = this.shapes.get(id);
      if (shape) {
        shape.destroy();
        this.shapes.delete(id);
      }

      // Remove any custom style
      this.styleManager.removeCustomStyle(id);

      if (this.selectedId === id) {
        this.selectedId = null;
      }

      this.emit('delete', { id });
    }
  }

  select(id: string): void {
    if (id !== this.selectedId) {
      // Remove selection style from previously selected
      if (this.selectedId) {
        const prevShape = this.shapes.get(this.selectedId);
        if (prevShape) {
          prevShape.setSelected(false);
        }
      }

      // Apply selection style to newly selected
      const shape = this.shapes.get(id);
      if (shape) {
        shape.setSelected(true);
        this.selectedId = id;
      }
    }
  }

  deselect(): void {
    if (this.selectedId) {
      const shape = this.shapes.get(this.selectedId);
      if (shape) {
        shape.setSelected(false);
      }
      this.selectedId = null;
    }
  }

  getAnnotation(id: string): Annotation | undefined {
    return this.annotations.get(id);
  }

  getAll(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  clear(): void {
    this.shapes.forEach(shape => shape.destroy());
    this.annotations.clear();
    this.shapes.clear();
    this.selectedId = null;
    this.spatialIndex.clear();
  }

  /**
   * Query annotations at a given point (SVG/image coordinates)
   */
  queryAtPoint(point: { x: number; y: number }): string[] {
    const hits = this.spatialIndex.search(point);
    return hits.map(item => item.id);
  }

  /**
   * Utility: Get bounding box for an annotation (in SVG/image coordinates)
   */
  private getAnnotationBBox(annotation: Annotation): { minX: number; minY: number; maxX: number; maxY: number } | null {
    const geom = annotation.target?.selector?.geometry;
    if (!geom) return null;
    switch (geom.type) {
      case 'rectangle':
        return {
          minX: geom.x,
          minY: geom.y,
          maxX: geom.x + geom.width,
          maxY: geom.y + geom.height
        };
      case 'polygon':
      case 'freehand':
        if (geom.points && geom.points.length) {
          const xs = geom.points.map((p: any) => p.x);
          const ys = geom.points.map((p: any) => p.y);
          return {
            minX: Math.min(...xs),
            minY: Math.min(...ys),
            maxX: Math.max(...xs),
            maxY: Math.max(...ys)
          };
        }
        break;
      case 'circle':
        return {
          minX: geom.cx - geom.r,
          minY: geom.cy - geom.r,
          maxX: geom.cx + geom.r,
          maxY: geom.cy + geom.r
        };
      case 'ellipse':
        return {
          minX: geom.cx - geom.rx,
          minY: geom.cy - geom.ry,
          maxX: geom.cx + geom.rx,
          maxY: geom.cy + geom.ry
        };
      case 'text':
        return {
          minX: geom.x,
          minY: geom.y,
          maxX: geom.x + geom.width,
          maxY: geom.y + geom.height
        };
      case 'point':
        // Use a small box around the point for hit testing
        const size = (geom.style?.size || 6) / 2;
        return {
          minX: geom.x - size,
          minY: geom.y - size,
          maxX: geom.x + size,
          maxY: geom.y + size
        };
      default:
        return null;
    }
    return null;
  }
}

