import { Geometry } from './shape.types';

/**
 * Purpose of an annotation body
 */
export type BodyPurpose =
  | 'commenting'    // Text comments
  | 'tagging'       // Tags/labels
  | 'classifying'   // Classification
  | 'identifying'   // Unique identifiers
  | 'linking'       // External links
  | 'describing'    // Detailed descriptions
  | 'bookmarking';  // Bookmarks/favorites

/**
 * Base annotation body interface
 */
export interface AnnotationBody {
  type: string;
  purpose: BodyPurpose;
  value: any;
  creator?: {
    id: string;
    name?: string;
  };
  created?: string;
  modified?: string;
}

/**
 * Text comment body
 */
export interface TextBody extends AnnotationBody {
  type: 'TextualBody';
  purpose: 'commenting';
  value: string;
}

/**
 * Tag/label body
 */
export interface TagBody extends AnnotationBody {
  type: 'TextualBody';
  purpose: 'tagging';
  value: string;
}

/**
 * Classification body
 */
export interface ClassificationBody extends AnnotationBody {
  type: 'Classification';
  purpose: 'classifying';
  value: {
    id: string;
    label: string;
    confidence?: number;
  };
}

/**
 * External link body
 */
export interface LinkBody extends AnnotationBody {
  type: 'Link';
  purpose: 'linking';
  value: string;
}

/**
 * Annotation target selector
 */
export interface AnnotationSelector {
  type: 'SvgSelector';
  geometry: Geometry;
}

/**
 * Annotation target
 */
export interface AnnotationTarget {
  source?: string;
  selector: AnnotationSelector;
  renderedVia?: {
    name: string;
    version?: string;
  };
}

/**
 * Complete annotation interface
 */
export interface Annotation {
  id: string;
  type: 'Annotation';  // Standardized to W3C annotation type
  body: AnnotationBody[];
  target: AnnotationTarget;
  
  // UI and styling properties
  style?: Record<string, any>;
  
  // Metadata
  customData?: Record<string, any>;
  created?: string;
  modified?: string;
  creator?: {
    id: string;
    name?: string;
  };
}

/**
 * Annotation event interfaces
 */
export interface AnnotationEvent {
  annotation: Annotation;
  annotationId?: string;
}

export interface AnnotationCreateEvent extends AnnotationEvent {
  type: 'create';
}

export interface AnnotationUpdateEvent extends AnnotationEvent {
  type: 'update';
  changes: Partial<Annotation>;
}

export interface AnnotationDeleteEvent {
  type: 'delete';
  annotationId: string;
}

export interface AnnotationSelectEvent {
  type: 'select';
  annotationId: string;
}

export interface AnnotationDeselectEvent {
  type: 'deselect';
  annotationId: string;
}

/**
 * Union type for all annotation-related events
 */
export type AnnotationEventType = 
  | AnnotationCreateEvent
  | AnnotationUpdateEvent 
  | AnnotationDeleteEvent
  | AnnotationSelectEvent
  | AnnotationDeselectEvent;


/**
 * Annotation collection interface for managing multiple annotations
 */
export interface AnnotationCollection {
  annotations: Annotation[];
  version?: string;
  created?: string;
  modified?: string;
  metadata?: Record<string, any>;
}

/**
 * Annotation query result interface
 */
export interface AnnotationQueryResult {
  annotations: Annotation[];
  total: number;
  offset?: number;
  limit?: number;
}

/**
 * Hit detection result interface
 */
export interface HitDetectionResult {
  id: string;
  distance: number;
  type: 'annotation';
  annotation?: Annotation;
}

/**
 * Annotation state interface for persistence
 */
export interface AnnotationStateSnapshot {
  annotations: Record<string, Annotation>;
  selectedIds: string[];
  editingId: string | null;
  version: string;
  timestamp: string;
}

/**
 * Export utility functions for type validation
 */
export const AnnotationUtils = {
  /**
   * Validate if an object is a valid annotation
   */
  isValidAnnotation(obj: any): obj is Annotation {
    return obj && 
           typeof obj.id === 'string' &&
           obj.type === 'Annotation' &&
           Array.isArray(obj.body) &&
           obj.target &&
           obj.target.selector &&
           obj.target.selector.geometry;
  },

  /**
   * Create a minimal annotation structure
   */
  createMinimalAnnotation(id: string, geometry: Geometry): Annotation {
    return {
      id,
      type: 'Annotation',
      body: [],
      target: {
        selector: {
          type: 'SvgSelector',
          geometry
        }
      },
      created: new Date().toISOString()
    };
  }
};
