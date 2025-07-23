import { EventEmitter } from '../events/EventEmitter';
import { Annotation } from '../../types/annotation.types';
import { Shape } from '../../shapes/base';
import { StyleManager } from '../managers/StyleManager';
import { SpatialIndex, SpatialItem } from './SpatialIndex';
import { HitDetection } from '../../utils/HitDetection';
import { Point } from '../../types/shape.types';
import { SVGUtils } from '../../utils';
import { ShapeStyle } from '../managers/StyleManager';


interface AnnotationStateEvents {
  create: { groupId: string };
  update: { groupId: string };
  delete: { groupId: string };
  select: { groupId: string };
  deselect: { groupId: string };
}

export class AnnotationState extends EventEmitter<AnnotationStateEvents> {
  private annotations: Map<string, Annotation>;
  private shapes: Map<string, Shape>;
  private selectedIds: Set<string>;
  private readonly styleManager: StyleManager;
  private readonly spatialIndex: SpatialIndex;


  constructor(styleManager: StyleManager) {
    super();
    this.annotations = new Map();
    this.shapes = new Map();
    this.selectedIds = new Set();
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

  // Restore getAnnotationBBox for annotation geometry (image coordinates)


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
      const style = this.styleManager.getMergedStyle(id, annotation.style);
      this.styleManager.setAnnotationStyle(id, annotation.style || {});
      shape.applyStyle(style);
    }
    this.emit('create', { groupId: annotation.groupId });
  }

  update(id: string, changes: Partial<Annotation>): void {
    const current = this.annotations.get(id);
    if(!current) return;
    const updated = { ...current, ...changes };
    this.annotations.set(id, updated);
    if (changes.target?.selector?.geometry) {
      const oldBbox = SVGUtils.getAnnotationBBox(current);
      const newBbox = SVGUtils.getAnnotationBBox(updated);
      if (oldBbox && newBbox) {
        this.spatialIndex.update({ ...oldBbox, id }, { ...newBbox, id });
      }
    }
    if (changes.target?.selector?.geometry) {
      const shape = this.shapes.get(id);
      if (shape) {
        shape.update(changes.target.selector.geometry);
        const style = this.styleManager.getStyle(id);
        shape.applyStyle(style);
      }
    }
    this.emit('update', { groupId: updated.groupId });
  }

  remove(id: string): void {
    const annotation = this.annotations.get(id);
    if (!annotation) return;
    const groupId = annotation.groupId;
    const groupAnnotations = this.getGroupAnnotations(groupId);
    groupAnnotations.forEach(a => {
      this._removeSingle(a.id, false);
    });
    this.emit('delete', { groupId });
  }

  private _removeSingle(id: string, emit: boolean): void {
    const annotation = this.annotations.get(id);
    if (!annotation) return;
    // Remove from spatial index using annotation geometry (image coordinates)
    const bbox = SVGUtils.getAnnotationBBox(annotation);
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
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    }
    // No per-id delete event; only groupId events are emitted in remove()
  }

  select(id: string): void {
    const annotation = this.annotations.get(id);
    if (!annotation) return;
    this.selectGroup(annotation.groupId);
  }


  /**
   * Select all annotations in a group with proper style management
   */
  selectGroup(groupId: string): void {
    // **KEY FIX**: Always deselect previous selections first
    if (this.selectedIds.size > 0) {
      const currentlySelected = Array.from(this.selectedIds);
      const firstSelectedAnnotation = this.annotations.get(currentlySelected[0]);
      
      if (firstSelectedAnnotation && firstSelectedAnnotation.groupId !== groupId) {
        this.deselectAll();
      }
    }

    const groupAnnotations = this.getGroupAnnotations(groupId);
    groupAnnotations.forEach(a => {
      if (!this.selectedIds.has(a.id)) {
        const shape = this.shapes.get(a.id);
        if (shape) {
          shape.setSelected(true, this.styleManager, a.id);
        }
        this.selectedIds.add(a.id);
      }
    });

    this.emit('select', { groupId });
  }

  /**
   * Deselect all with proper style restoration
   */
  deselectAll(): void {
    if (this.selectedIds.size === 0) return;

    const firstId = this.selectedIds.values().next().value ?? '';
    const annotation = this.annotations.get(firstId);
    if (!annotation) return;
    
    const groupId = annotation.groupId;

    this.selectedIds.forEach(id => {
      const shape = this.shapes.get(id);
      if (shape) {
        shape.setSelected(false, this.styleManager, id);
      }
    });

    this.selectedIds.clear();
    this.emit('deselect', { groupId });
  }

  getAnnotation(id: string): Annotation | undefined {
    return this.annotations.get(id);
  }

  getShape(id: string): Shape | undefined {
    return this.shapes.get(id);
  }

  getAll(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  clear(): void {
    this.shapes.forEach(shape => shape.destroy());
    this.annotations.clear();
    this.shapes.clear();
    this.selectedIds.clear();
    this.spatialIndex.clear();
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

  getGroupIdForAnnotation(annotationId: string): string | undefined {
    const annotation = this.annotations.get(annotationId);
    return annotation?.groupId;
  }


  getGroupAnnotations(groupId: string): Annotation[] {
    return Array.from(this.annotations.values())
      .filter(a => a.groupId === groupId);
  }


}

