import { Viewer } from 'openseadragon';

export interface AnnotationEvent {
  annotation: any;
  annotationId?: string;
}

export interface OpenSeadragonAnnotatorOptions {
  viewer: Viewer;
  theme: string;
  defaultTool: string;
  showControls?: boolean;
  showEditForm?: boolean;
}

export interface OpenSeadragonAnnotoriousToolbarOptions {
  annotator: any;
  tools: string[];
  position: string;
}

export interface OpenSeadragonAnnotator {
  on(event: string, callback: (evt: AnnotationEvent) => void): void;
  destroy(): void;
  getAnnotations(): any[];
  addAnnotation(annotation: any): void;
  removeAnnotation(annotationId: string): void;
  clearAnnotations(): void;
}

export interface OpenSeadragonAnnotoriousToolbar {
  destroy(): void;
  element: HTMLElement;
}
