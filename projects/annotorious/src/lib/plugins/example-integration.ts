import OpenSeadragon from 'openseadragon';
import { OpenSeadragonAnnotator, SvgOverlayPlugin } from '../index';

/**
 * Example demonstrating the integration of the SVG Overlay Plugin with Annotorious
 */
export function createAnnotoriousWithSvgOverlay(containerId: string, imageUrl: string) {
  // Create OpenSeadragon viewer
  const viewer = OpenSeadragon({
    id: containerId,
    tileSources: imageUrl,
    showNavigator: true,
    navigatorPosition: 'BOTTOM_RIGHT'
  });

  // Initialize Annotorious with SVG overlay plugin
  const annotator = new OpenSeadragonAnnotator({
    viewer: viewer,
    imageUrl: imageUrl,
    toolType: 'rectangle',
    crosshair: true
  });

  // Get the SVG overlay for custom elements
  const svgOverlay = annotator.getSvgOverlay();
  const overlayNode = svgOverlay.node();

  // Add custom SVG elements that will scale with annotations
  const customCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  customCircle.setAttribute('cx', '300');
  customCircle.setAttribute('cy', '200');
  customCircle.setAttribute('r', '50');
  customCircle.setAttribute('fill', 'blue');
  customCircle.setAttribute('opacity', '0.6');
  customCircle.setAttribute('stroke', 'white');
  customCircle.setAttribute('stroke-width', '2');

  overlayNode.appendChild(customCircle);

  // Add click handler to custom element
  svgOverlay.onClick(customCircle, (event) => {
    console.log('Custom circle clicked!', event);
    alert('Custom SVG element clicked!');
  });

  // Add a custom rectangle
  const customRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  customRect.setAttribute('x', '100');
  customRect.setAttribute('y', '100');
  customRect.setAttribute('width', '150');
  customRect.setAttribute('height', '100');
  customRect.setAttribute('fill', 'green');
  customRect.setAttribute('opacity', '0.4');
  customRect.setAttribute('stroke', 'darkgreen');
  customRect.setAttribute('stroke-width', '3');

  overlayNode.appendChild(customRect);

  // Add click handler to rectangle
  svgOverlay.onClick(customRect, (event) => {
    console.log('Custom rectangle clicked!', event);
    alert('Custom rectangle clicked!');
  });

  // Example: Add annotations programmatically
  setTimeout(() => {
    annotator.addAnnotation({
      type: 'Annotation',
      id: 'example-annotation',
      body: [
        {
          type: 'TextualBody',
          purpose: 'commenting',
          value: 'Example annotation'
        }
      ],
      target: {
        source: imageUrl,
        selector: {
          type: 'SvgSelector',
          geometry: {
            type: 'rectangle',
            x: 400,
            y: 300,
            width: 200,
            height: 150
          }
        }
      }
    } as any);
  }, 1000);

  // Example: Listen for annotation events
  annotator.on('create', (event) => {
    console.log('Annotation created:', event);
  });

  annotator.on('select', (event) => {
    console.log('Annotation selected:', event);
  });

  // Return the annotator for external use
  return {
    annotator,
    svgOverlay,
    viewer
  };
}

/**
 * Example of using the SVG overlay plugin independently
 */
export function createStandaloneSvgOverlay(containerId: string, imageUrl: string) {
  // Create OpenSeadragon viewer
  const viewer = OpenSeadragon({
    id: containerId,
    tileSources: imageUrl
  });

  // Get SVG overlay
  const overlay = viewer.svgOverlay({
    className: 'my-custom-overlay',
    enableClickHandling: true
  });

  const node = overlay.node();

  // Add custom SVG elements
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '100');
  rect.setAttribute('y', '100');
  rect.setAttribute('width', '200');
  rect.setAttribute('height', '150');
  rect.setAttribute('fill', 'red');
  rect.setAttribute('opacity', '0.5');
  rect.setAttribute('stroke', 'darkred');
  rect.setAttribute('stroke-width', '2');

  node.appendChild(rect);

  // Add click handler
  overlay.onClick(rect, (event) => {
    console.log('Rectangle clicked!', event);
    alert('SVG element clicked!');
  });

  // Add a polygon
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', '300,200 350,150 400,200 350,250');
  polygon.setAttribute('fill', 'purple');
  polygon.setAttribute('opacity', '0.7');
  polygon.setAttribute('stroke', 'darkpurple');
  polygon.setAttribute('stroke-width', '2');

  node.appendChild(polygon);

  overlay.onClick(polygon, (event) => {
    console.log('Polygon clicked!', event);
    alert('Polygon clicked!');
  });

  return {
    overlay,
    viewer
  };
}

/**
 * Example of custom transform function
 */
export function createCustomTransformOverlay(containerId: string, imageUrl: string) {
  const viewer = OpenSeadragon({
    id: containerId,
    tileSources: imageUrl
  });

  const overlay = viewer.svgOverlay({
    customTransform: (viewport, containerSize) => {
      const p = viewport.pixelFromPoint(new OpenSeadragon.Point(0, 0), true);
      const zoom = viewport.getZoom(true);
      const rotation = viewport.getRotation();
      
      // Custom scaling with 1.5x magnification
      const scale = zoom * 1.5;
      
      return `translate(${p.x},${p.y}) scale(${scale},${scale}) rotate(${rotation})`;
    }
  });

  const node = overlay.node();

  // Add elements that will use the custom transform
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '250');
  circle.setAttribute('cy', '250');
  circle.setAttribute('r', '75');
  circle.setAttribute('fill', 'orange');
  circle.setAttribute('opacity', '0.6');

  node.appendChild(circle);

  return {
    overlay,
    viewer
  };
} 