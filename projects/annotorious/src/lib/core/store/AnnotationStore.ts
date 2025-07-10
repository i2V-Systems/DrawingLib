import { EventEmitter } from '../events/EventEmitter';
import { Annotation, AnnotationBody } from '../annotation/types';

/**
 * Store action types
 */
type StoreAction = 
  | { type: 'CREATE'; annotation: Annotation }
  | { type: 'UPDATE'; id: string; changes: Partial<Annotation> }
  | { type: 'DELETE'; id: string; annotation: Annotation }
  | { type: 'ADD_BODY'; id: string; body: AnnotationBody }
  | { type: 'REMOVE_BODY'; id: string; bodyIndex: number; body: AnnotationBody }
  | { type: 'CLEAR' };


/**
 * Manages annotation data with undo/redo support
 */
export class AnnotationStore extends EventEmitter {
  private annotations: Map<string, Annotation>;
  private undoStack: StoreAction[];
  private redoStack: StoreAction[];
  private batchOperation: boolean;
  private batchActions: StoreAction[];

  constructor() {
    super();
    this.annotations = new Map();
    this.undoStack = [];
    this.redoStack = [];
    this.batchOperation = false;
    this.batchActions = [];
  }

  /**
   * Start a batch operation
   */
  startBatch(): void {
    this.batchOperation = true;
    this.batchActions = [];
  }

  /**
   * End a batch operation
   */
  endBatch(): void {
    this.batchOperation = false;
    if (this.batchActions.length > 0) {
      this.undoStack.push(...this.batchActions);
      this.redoStack = [];
    }
    this.batchActions = [];
  }

  /**
   * Add an annotation
   */
  create(annotation: Annotation): void {
    const action = { type: 'CREATE' as const, annotation };
    this.executeAction(action);
  }

  /**
   * Update an annotation
   */
  update(id: string, changes: Partial<Annotation>): void {
    const action = { type: 'UPDATE' as const, id, changes };
    this.executeAction(action);
  }

  /**
   * Delete an annotation
   */
  delete(id: string): void {
    const annotation = this.annotations.get(id);
    if (annotation) {
      const action = { type: 'DELETE' as const, id, annotation };
      this.executeAction(action);
    }
  }

  /**
   * Add a body to an annotation
   */
  addBody(id: string, body: AnnotationBody): void {
    const action = { type: 'ADD_BODY' as const, id, body };
    this.executeAction(action);
  }

  /**
   * Remove a body from an annotation
   */
  removeBody(id: string, bodyIndex: number): void {
    const annotation = this.annotations.get(id);
    if (annotation) {
      const body = annotation.body[bodyIndex];
      const action = { type: 'REMOVE_BODY' as const, id, bodyIndex, body };
      this.executeAction(action);
    }
  }

  /**
   * Clear all annotations
   */
  clear(): void {
    const action = { type: 'CLEAR' as const };
    this.executeAction(action);
  }

  /**
   * Get an annotation by ID
   */
  get(id: string): Annotation | undefined {
    return this.annotations.get(id);
  }

  /**
   * Get all annotations
   */
  getAll(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  /**
   * Undo the last action
   */
  undo(): void {
    const action = this.undoStack.pop();
    if (action) {
      this.executeReverseAction(action);
      this.redoStack.push(action);
    }
  }

  /**
   * Redo the last undone action
   */
  redo(): void {
    const action = this.redoStack.pop();
    if (action) {
      this.executeAction(action);
      this.undoStack.push(action);
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Execute a store action
   */
  private executeAction(action: StoreAction): void {
    switch (action.type) {
      case 'CREATE': {
        this.annotations.set(action.annotation.id, action.annotation);
        this.emit('create', { type: 'create', annotation: action.annotation });
        break;
      }

      case 'UPDATE': {
        const annotation = this.annotations.get(action.id);
        if (annotation) {
          const updated = { ...annotation, ...action.changes };
          this.annotations.set(action.id, updated);
          this.emit('update', { type: 'update', id: action.id, changes: action.changes });
        }
        break;
      }

      case 'DELETE': {
        const annotation = this.annotations.get(action.id);
        if (annotation) {
          this.annotations.delete(action.id);
          this.emit('delete', { type: 'delete', id: action.id, annotation });
        }
        break;
      }

      case 'ADD_BODY': {
        const annotation = this.annotations.get(action.id);
        if (annotation) {
          const updated = {
            ...annotation,
            body: [...annotation.body, action.body]
          };
          this.annotations.set(action.id, updated);
          this.emit('update', { type: 'update', id: action.id, changes: { body: updated.body } });
        }
        break;
      }

      case 'REMOVE_BODY': {
        const annotation = this.annotations.get(action.id);
        if (annotation) {
          const body = [...annotation.body];
          const removedBody = body[action.bodyIndex];
          body.splice(action.bodyIndex, 1);
          const updated = { ...annotation, body };
          this.annotations.set(action.id, updated);
          this.emit('update', { type: 'update', id: action.id, changes: { body } });
          // Store the removed body in the action for undo
          action.body = removedBody;
        }
        break;
      }

      case 'CLEAR': {
        this.annotations.clear();
        this.emit('clear', { type: 'clear' });
        break;
      }
    }

    if (!this.batchOperation) {
      this.undoStack.push(action);
      this.redoStack = [];
    } else {
      this.batchActions.push(action);
    }
  }

  /**
   * Execute the reverse of an action (for undo)
   */
  private executeReverseAction(action: StoreAction): void {
    switch (action.type) {
      case 'CREATE': {
        this.annotations.delete(action.annotation.id);
        this.emit('delete', { 
          type: 'delete', 
          id: action.annotation.id, 
          annotation: action.annotation 
        });
        break;
      }

      case 'UPDATE': {
        const annotation = this.annotations.get(action.id);
        if (annotation) {
          const original: Partial<Annotation> = {};
          for (const key in action.changes) {
            if (Object.prototype.hasOwnProperty.call(action.changes, key)) {
              original[key as keyof Annotation] = annotation[key as keyof Annotation] as any;
            }
          }
          
          const updated = { ...annotation, ...original };
          this.annotations.set(action.id, updated);
          this.emit('update', { type: 'update', id: action.id, changes: original });
        }
        break;
      }

      case 'DELETE': {
        this.annotations.set(action.id, action.annotation);
        this.emit('create', { type: 'create', annotation: action.annotation });
        break;
      }

      case 'ADD_BODY': {
        const annotation = this.annotations.get(action.id);
        if (annotation) {
          const body = annotation.body.slice(0, -1);
          const updated = { ...annotation, body };
          this.annotations.set(action.id, updated);
          this.emit('update', { type: 'update', id: action.id, changes: { body } });
        }
        break;
      }

      case 'REMOVE_BODY': {
        const annotation = this.annotations.get(action.id);
        if (annotation) {
          const body = [...annotation.body];
          body.splice(action.bodyIndex, 0, action.body);
          const updated = { ...annotation, body };
          this.annotations.set(action.id, updated);
          this.emit('update', { type: 'update', id: action.id, changes: { body } });
        }
        break;
      }

      case 'CLEAR': {
        // Cannot undo clear
        break;
      }
    }
  }
}
