/**
 * Core annotation types following the W3C Web Annotation Data Model
 * @see https://www.w3.org/TR/annotation-model/
 */

import { Geometry } from '../../shapes/types';

/**
 * Purpose of an annotation body
 */
export type BodyPurpose = 
  | 'commenting'   // Text comments
  | 'tagging'      // Tags/labels
  | 'classifying'  // Classification
  | 'identifying'  // Unique identifiers
  | 'linking'      // External links
  | 'describing'   // Detailed descriptions
  | 'bookmarking'; // Bookmarks/favorites

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
  type: 'Annotation';
  body: AnnotationBody[];
  target: AnnotationTarget;
  creator?: {
    id: string;
    name?: string;
  };
  created?: string;
  modified?: string;
  motivation?: string;
  rights?: string;
  label?: string;
}

export interface AnnotationEvent {
  annotation: Annotation;
  annotationId?: string;
}
