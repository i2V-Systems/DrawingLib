// Core exports
export * from './core/annotation';
export * from './core/events';
export * from './core/state';
export * from './core/labels/LabelManager';
export * from './core/filters/FilterManager';
export * from './core/groups/GroupManager';

// Shape exports
export * from './shapes/base';
export * from './shapes/selectors';
export * from './shapes/types';
export * from './shapes/tools/TextTool';
export * from './shapes/tools/GroupTool';


// Angular Components
export * from './angular';
export * from './angular/types';

// Utility exports
export * from './utils';

// Main Annotator class
export { Annotator } from './core/Annotator';
export { OpenSeadragonAnnotator } from './openseadragon/OpenSeadragonAnnotator';
