import { EventEmitter } from '../events/EventEmitter';
import { Annotation } from '../../types/annotation.types';
import { Shape } from '../../shapes/base';
import { SpatialIndex } from './SpatialIndex';
import { HitDetection, SVGUtils } from '../../utils';
import { Point } from '../../types/shape.types';
interface AnnotationStateEvents {
  create: { id: string };
  update: { id: string };
  delete: { id: string };
  select: { id: string };
  deselect: { id: string };
  disableMouseNavigation: {};
  enableMouseNavigation: {};
}

export class AnnotationState extends EventEmitter<AnnotationStateEvents> {
  private annotations: Map<string, Annotation>;
  private shapes: Map<string, Shape>;
  private selectedId: string | null = null;
  private readonly spatialIndex: SpatialIndex;

  constructor() {
    super();
    this.annotations = new Map();
    this.shapes = new Map();
    this.spatialIndex = new SpatialIndex();
  }


  /**
   * Add a new annotation with its associated shape
   */
  add(annotation: Annotation, shape?: Shape): void {
    const id = annotation.id || crypto.randomUUID();
    annotation.id = id;
    this.annotations.set(id, annotation);

    if (shape) {
      this.shapes.set(id, shape);
      const bbox = SVGUtils.getAnnotationBBox(annotation);
      if (bbox) {
        this.spatialIndex.insert({ ...bbox, id });
      }
    }

    this.emit('create', { id });
  }

  /**
   * Update an existing annotation
   */
  update(id: string, changes: Partial<Annotation>): void {
    const current = this.annotations.get(id);
    if (!current) return;

    const updated = { ...current, ...changes };
    this.annotations.set(id, updated);

    // Update spatial index if geometry changed
    if (changes.target?.selector?.geometry) {
      const oldBbox = SVGUtils.getAnnotationBBox(current);
      const newBbox = SVGUtils.getAnnotationBBox(updated);
      if (oldBbox && newBbox) {
        this.spatialIndex.update({ ...oldBbox, id }, { ...newBbox, id });
      }

      // Update shape geometry
      const shape = this.shapes.get(id);
      if (shape) {
        shape.update(changes.target.selector.geometry);
      }
    }

    this.emit('update', { id });
  }

  /**
   * Remove an annotation and its associated shape and label
   */
  remove(id: string): void {
    const annotation = this.annotations.get(id);
    if (!annotation) return;

    // Remove from spatial index
    const bbox = SVGUtils.getAnnotationBBox(annotation);
    if (bbox) {
      this.spatialIndex.remove({ ...bbox, id });
    }

    // Clean up shape
    const shape = this.shapes.get(id);
    if (shape) {
      shape.destroy();
      this.shapes.delete(id);
    }

    // Clean up annotation
    this.annotations.delete(id);

    // Clean up selection
    if (this.selectedId === id) {
      this.selectedId = null;
    }

    this.emit('delete', { id });
  }

  /**
   * Select an annotation and start editing it
   */
  select(id: string): void {
    this.deselectAll();
    
    const shape = this.shapes.get(id);
    if (shape) {
      this.selectedId = id;
      this.emit('select', { id });
    }
  }

  deselectAll(): void {
    if (this.selectedId === null) return;

    this.emit('deselect', { id: this.selectedId });
    this.selectedId = null;
  }

  
  /**
   * Get an annotation by ID
   */
  getAnnotation(id: string): Annotation | undefined {
    return this.annotations.get(id);
  }

  /**
   * Get a shape by ID
   */
  getShape(id: string): Shape | undefined {
    return this.shapes.get(id);
  }

  /**
   * Get all annotations
   */
  getAll(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  /**
   * Clear all annotations, shapes, and labels
   */
  clear(): void {
    this.shapes.forEach(shape => shape.destroy());
    
    this.annotations.clear();
    this.shapes.clear();
    this.selectedId = null;
    this.spatialIndex.clear();
  }

  /**
   * Check if an annotation is currently selected
   */
  isSelected(id: string): boolean {
    return this.selectedId === id;
  }

  /**
   * Get all selected annotation IDs
   */
  getSelectedId(): string | null {
    return this.selectedId;
  }

  /**
   * Check if any annotations are selected
   */
  hasSelections(): boolean {
    return this.selectedId !== null;
  }
  
 /**
   * Query annotations at a given point (SVG/image coordinates)
   */
  queryAtPoint(point: { x: number; y: number }, tolerance: number = 5): string[] {
    const searchBox = {
      minX: point.x - tolerance,
      minY: point.y - tolerance,
      maxX: point.x + tolerance,
      maxY: point.y + tolerance
    };
    const hits = this.spatialIndex.search(searchBox);
    return hits.map(item => item.id);
  }

  /**
   * Find the best hit annotation at a given point using precise hit detection
   */
  findHitAnnotation(point: Point, tolerance: number = 5): { id: string; distance: number } | null {
    // Get candidates using tolerance-aware spatial index search
    const candidateIds = this.queryAtPoint(point, tolerance);
    if (candidateIds.length === 0) {
      return null;
    }

    let bestHit: { id: string; distance: number } | null = null;
    let minDistance = Infinity;

    // Test each candidate with precise hit detection
    for (const id of candidateIds) {
      const annotation = this.annotations.get(id);
      if (!annotation || !annotation.target?.selector?.geometry) {
        continue;
      }

      const hitResult = HitDetection.hitTest(point, annotation.target.selector.geometry, tolerance);
      if (hitResult.hit && hitResult.distance < minDistance) {
        minDistance = hitResult.distance;
        bestHit = { id, distance: hitResult.distance };
      }
    }

    return bestHit;
  }

  /**
   * Destroy the annotation state and clean up resources
   */
  destroy(): void {
    this.clear();
    this.removeAllListeners();
  }
}
