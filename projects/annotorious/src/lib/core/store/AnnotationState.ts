import { EventEmitter } from '../events/EventEmitter';
import { Annotation } from '../../types/annotation.types';
import { Shape } from '../../shapes/base';
import { SpatialIndex } from './SpatialIndex';
import { HitDetection, SVGUtils } from '../../utils';
import { Point, TextGeometry } from '../../types/shape.types';
interface AnnotationStateEvents {
  loaded: {};
  create: { id: string };
  update: { id: string };
  delete: { annotation: Annotation };
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
  private suppressEvents = false;
  private hiddenAnnotations: Set<string> = new Set();

  constructor() {
    super();
    this.annotations = new Map();
    this.shapes = new Map();
    this.spatialIndex = new SpatialIndex();
  }

  /**
   * Batch update method: applies multiple updates and emits a single event.
   * The updater can mutate or return a new annotation object.
   */
  batchUpdate(
    id: string,
    updater: (annotation: Annotation) => Partial<Annotation>
  ): void {
    const current = this.annotations.get(id);
    if (!current) return;
    this.suppressEvents = true;
    let updates: Partial<Annotation> = {};
    try {
      updates = updater({ ...current });
      this.update(id, updates, false); // use new param!
    } finally {
      this.suppressEvents = false;
    }
    // Emit only one event after all updates
    this.emit('update', { id });
  }

  /**
   * Load annotations in batch without firing create events for each.
   */
  loadAnnotations(
    annotationShapes: { annotation: Annotation; shape: Shape }[]
  ): void {
    for (const aS of annotationShapes) {
      const id = aS.annotation.id || crypto.randomUUID();
      aS.annotation.id = id;
      this.annotations.set(id, aS.annotation);
      if (aS.shape) {
        this.shapes.set(id, aS.shape);
        const bbox = SVGUtils.getAnnotationBBox(aS.annotation);
        if (bbox) {
          this.spatialIndex.insert({ ...bbox, id });
        }
        if (aS.annotation.label) {
          if (!aS.annotation.label.x || !aS.annotation.label.y) {
            const shapeBbox = SVGUtils.getAnnotationBBox(aS.annotation);
            if (shapeBbox) {
              aS.annotation.label.x =
                shapeBbox.minX + (shapeBbox.maxX - shapeBbox.minX) / 2;
              aS.annotation.label.y = shapeBbox.minY - 10; // 10px above the bbox
            }
          }
          const labelBbox = SVGUtils.getAnnotationBBox({
            target: { selector: { geometry: aS.annotation.label } },
          } as Annotation);
          if (labelBbox) {
            this.spatialIndex.insert({ ...labelBbox, id: `label-${id}` });
          }
          aS.shape.updateLabel(aS.annotation.label);
        }
      }
    }

    this.emit('loaded', {});
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
      if (annotation.label) {
        if (!annotation.label.x || !annotation.label.y) {
          const shapeBbox = SVGUtils.getAnnotationBBox(annotation);
          if (shapeBbox) {
            annotation.label.x =
              shapeBbox.minX + (shapeBbox.maxX - shapeBbox.minX) / 2;
            annotation.label.y = shapeBbox.minY - 10; // 10px above the bbox
          }
        }
        const labelBbox = SVGUtils.getAnnotationBBox({
          target: { selector: { geometry: annotation.label } },
        } as Annotation);
        if (labelBbox) {
          this.spatialIndex.insert({ ...labelBbox, id: `label-${id}` });
        }
        shape.updateLabel(annotation.label);
      }
    }

    this.emit('create', { id });
  }

  /**
   * Update an existing annotation
   */
  update(
    id: string,
    changes: Partial<Annotation>,
    emitEvent: boolean = true
  ): void {
    if (id != this.selectedId) return;
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
    if (changes.label) {
      const oldLabelBbox = current.label
        ? SVGUtils.getAnnotationBBox({
            target: { selector: { geometry: current.label } },
          } as Annotation)
        : null;
      const newLabelBbox = SVGUtils.getAnnotationBBox({
        target: { selector: { geometry: changes.label } },
      } as Annotation);
      if (oldLabelBbox && newLabelBbox) {
        this.spatialIndex.update(
          { ...oldLabelBbox, id: `label-${id}` },
          { ...newLabelBbox, id: `label-${id}` }
        );
      } else if (newLabelBbox) {
        this.spatialIndex.insert({ ...newLabelBbox, id: `label-${id}` });
      }
      // const shape = this.shapes.get(id);
      // if (shape) {
      //   shape.updateLabel(changes.label);
      // }
    }
    if (emitEvent && !this.suppressEvents) {
      this.emit('update', { id });
    }
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
    if (annotation.label) {
      const labelBbox = SVGUtils.getAnnotationBBox({
        target: { selector: { geometry: annotation.label } },
      } as Annotation);
      if (labelBbox) {
        this.spatialIndex.remove({ ...labelBbox, id: `label-${id}` });
      }
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

    this.emit('delete', { annotation });
  }

  /**
   * Set label for an annotation with spatial index update
   */
  setLabel(id: string, labelGeometry: TextGeometry): void {
    const annotation = this.annotations.get(id);
    if (!annotation) return;

    // Remove old label from spatial index
    if (annotation.label) {
      const oldLabelBbox = SVGUtils.getAnnotationBBox({
        target: { selector: { geometry: annotation.label } },
      } as Annotation);
      if (oldLabelBbox) {
        this.spatialIndex.remove({ ...oldLabelBbox, id: `label-${id}` });
      }
    }

    // Update annotation with new label
    const updated = { ...annotation, label: labelGeometry };
    this.annotations.set(id, updated);

    // Add new label to spatial index
    const newLabelBbox = SVGUtils.getAnnotationBBox({
      target: { selector: { geometry: labelGeometry } },
    } as Annotation);
    if (newLabelBbox) {
      this.spatialIndex.insert({ ...newLabelBbox, id: `label-${id}` });
    }

    // Update shape
    const shape = this.shapes.get(id);
    if (shape) {
      shape.updateLabel(labelGeometry);
    }

    this.emit('update', { id });
  }

  /**
   * Remove label from an annotation
   */
  removeLabel(id: string): void {
    const annotation = this.annotations.get(id);
    if (!annotation || !annotation.label) return;

    // Remove from spatial index
    const labelBbox = SVGUtils.getAnnotationBBox({
      target: { selector: { geometry: annotation.label } },
    } as Annotation);
    if (labelBbox) {
      this.spatialIndex.remove({ ...labelBbox, id: `label-${id}` });
    }

    // Update annotation
    const updated = { ...annotation };
    delete updated.label;
    this.annotations.set(id, updated);

    // Update shape
    const shape = this.shapes.get(id);
    if (shape) {
      shape.removeLabel();
    }

    this.emit('update', { id });
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

  getShapes(): Shape[] {
    return Array.from(this.shapes.values());
  }

  /**
   * Clear all annotations, shapes, and labels
   */
  clear(): void {
    this.shapes.forEach((shape) => shape.destroy());

    this.annotations.clear();
    this.shapes.clear();
    this.selectedId = null;
    this.spatialIndex.clear();
    this.clearHiddenState();
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
  queryAtPoint(
    point: { x: number; y: number },
    tolerance: number = 5
  ): string[] {
    const searchBox = {
      minX: point.x - tolerance,
      minY: point.y - tolerance,
      maxX: point.x + tolerance,
      maxY: point.y + tolerance,
    };
    const hits = this.spatialIndex.search(searchBox);
    return hits.map((item) =>
      item.id.startsWith('label-') ? item.id.substring(6) : item.id
    );
  }

  /**
   * Find the best hit annotation at a given point using precise hit detection
   */
  findHitAnnotation(
    point: Point,
    tolerance: number = 5
  ): { id: string; distance: number } | null {
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
      if (!annotation) {
        continue;
      }

      let hitResult = null;
      if (annotation.target?.selector?.geometry) {
        hitResult = HitDetection.hitTest(
          point,
          annotation.target.selector.geometry,
          tolerance
        );
      }

      if (annotation.label) {
        const labelHitResult = HitDetection.hitTest(
          point,
          annotation.label,
          tolerance
        );
        if (
          labelHitResult.hit &&
          (!hitResult ||
            !hitResult.hit ||
            labelHitResult.distance < hitResult.distance)
        ) {
          hitResult = labelHitResult;
        }
      }

      if (hitResult && hitResult.hit && hitResult.distance < minDistance) {
        minDistance = hitResult.distance;
        bestHit = { id, distance: hitResult.distance };
      }
    }

    return bestHit;
  }

  /**
   * Set annotation visibility in state
   */
  setAnnotationVisible(id: string, visible: boolean): void {
    if (visible) {
      this.hiddenAnnotations.delete(id);
    } else {
      this.hiddenAnnotations.add(id);
    }
  }

  /**
   * Check if annotation is visible in state
   */
  isAnnotationVisible(id: string): boolean {
    return !this.hiddenAnnotations.has(id);
  }

  /**
   * Get all hidden annotation IDs
   */
  getHiddenAnnotationIds(): string[] {
    return Array.from(this.hiddenAnnotations);
  }

  /**
   * Get all visible annotation IDs
   */
  getVisibleAnnotationIds(): string[] {
    return this.getAll()
      .filter((annotation) => this.isAnnotationVisible(annotation.id))
      .map((annotation) => annotation.id);
  }

  /**
   * Clear hidden state
   */
  clearHiddenState(): void {
    this.hiddenAnnotations.clear();
  }

  /**
   * Destroy the annotation state and clean up resources
   */
  destroy(): void {
    this.clear();
    this.removeAllListeners();
  }
}
