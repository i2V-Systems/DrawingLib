// Core exports
export type { Annotation, AnnotationBody, AnnotationTarget, AnnotationSelector, BodyPurpose, TextBody, TagBody, ClassificationBody, LinkBody } from './types/annotation.types';
export * from './core/events';
export * from './core/state';
export * from './core/labels/LabelManager';
export * from './core/selection/SelectionManager';

export * from './core/tools';
export * from './core/style';
export * from './core/editing';
export * from './core/store';

// Crosshair exports
export { Crosshair } from './core/Crosshair';
export type { CrosshairConfig } from './core/Crosshair';

// Touch utilities
export { isTouchDevice, enableTouchTranslation } from './utils/Touch';

// Shape exports
export * from './shapes/base';
export type * from './types/shape.types';
export * from './shapes/tools';


// Angular Components
export * from './angular';
export * from './angular/types';

// Utility exports
export * from './utils';

// Plugin exports
export * from './plugins';

// Main Annotator class
export { OpenSeadragonAnnotator } from './core/OpenSeadragonAnnotator';
