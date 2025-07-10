import { EventEmitter } from '../events/EventEmitter';
import { Annotation } from '../annotation/types';

export type FilterFunction = (annotation: Annotation) => boolean;

export interface Filter {
  id: string;
  name: string;
  fn: FilterFunction;
  enabled: boolean;
}

/**
 * Manages annotation filters
 */
export class FilterManager extends EventEmitter {
  private filters: Map<string, Filter>;
  private annotations: Map<string, Annotation>;
  private visibilityMap: Map<string, boolean>;

  constructor() {
    super();
    
    this.filters = new Map();
    this.annotations = new Map();
    this.visibilityMap = new Map();
  }

  /**
   * Add a filter
   */
  addFilter(filter: Filter): void {
    this.filters.set(filter.id, filter);
    this.applyFilters();
    this.emit('filterAdded', { filter });
  }

  /**
   * Remove a filter
   */
  removeFilter(id: string): void {
    const filter = this.filters.get(id);
    if (filter) {
      this.filters.delete(id);
      this.applyFilters();
      this.emit('filterRemoved', { filter });
    }
  }

  /**
   * Enable/disable a filter
   */
  setFilterEnabled(id: string, enabled: boolean): void {
    const filter = this.filters.get(id);
    if (filter) {
      filter.enabled = enabled;
      this.applyFilters();
      this.emit('filterEnabled', { filter, enabled });
    }
  }

  /**
   * Get all filters
   */
  getFilters(): Filter[] {
    return Array.from(this.filters.values());
  }

  /**
   * Track an annotation
   */
  trackAnnotation(annotation: Annotation): void {
    this.annotations.set(annotation.id, annotation);
    this.applyFilters();
  }

  /**
   * Untrack an annotation
   */
  untrackAnnotation(id: string): void {
    this.annotations.delete(id);
    this.visibilityMap.delete(id);
  }

  /**
   * Update tracked annotation
   */
  updateAnnotation(id: string, annotation: Annotation): void {
    this.annotations.set(id, annotation);
    this.applyFilters();
  }

  /**
   * Check if an annotation is visible
   */
  isVisible(id: string): boolean {
    return this.visibilityMap.get(id) ?? true;
  }

  /**
   * Apply all active filters
   */
  private applyFilters(): void {
    const activeFilters = Array.from(this.filters.values())
      .filter(f => f.enabled);

    // Reset visibility map
    this.visibilityMap.clear();

    // Apply filters to all annotations
    this.annotations.forEach((annotation, id) => {
      const visible = activeFilters.every(filter => filter.fn(annotation));
      this.visibilityMap.set(id, visible);
    });

    this.emit('filtersApplied', {
      visibilityMap: new Map(this.visibilityMap)
    });
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.filters.clear();
    this.annotations.clear();
    this.visibilityMap.clear();
  }
}

/**
 * Common filter functions
 */
export const CommonFilters = {
  /**
   * Filter by tag
   */
  byTag: (tag: string): FilterFunction => {
    return (annotation: Annotation) => {
      const tagBody = annotation.body.find(b => 
        b.purpose === 'tagging' && b.value === tag
      );
      return !!tagBody;
    };
  },

  /**
   * Filter by creator
   */
  byCreator: (creatorId: string): FilterFunction => {
    return (annotation: Annotation) => {
      return annotation.creator?.id === creatorId;
    };
  },

  /**
   * Filter by date range
   */
  byDateRange: (start: Date, end: Date): FilterFunction => {
    return (annotation: Annotation) => {
      if (!annotation.created) return false;
      const created = new Date(annotation.created);
      return created >= start && created <= end;
    };
  },

  /**
   * Filter by shape type
   */
  byShapeType: (type: string): FilterFunction => {
    return (annotation: Annotation) => {
      return annotation.target.selector.geometry.type === type;
    };
  },

  /**
   * Filter by text content
   */
  byTextContent: (text: string): FilterFunction => {
    return (annotation: Annotation) => {
      const textBody = annotation.body.find(b => 
        b.purpose === 'commenting' && 
        typeof b.value === 'string' &&
        b.value.toLowerCase().includes(text.toLowerCase())
      );
      return !!textBody;
    };
  },

  /**
   * Combine multiple filters (AND)
   */
  and: (...filters: FilterFunction[]): FilterFunction => {
    return (annotation: Annotation) => {
      return filters.every(f => f(annotation));
    };
  },

  /**
   * Combine multiple filters (OR)
   */
  or: (...filters: FilterFunction[]): FilterFunction => {
    return (annotation: Annotation) => {
      return filters.some(f => f(annotation));
    };
  }
};
