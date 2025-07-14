# SVG Overlay Plugin Integration

The SVG Overlay Plugin has been fully integrated into the Annotorious library, providing a scalable SVG overlay that automatically transforms with the OpenSeadragon viewport.

## Features

- **Automatic Integration**: The plugin is automatically installed when the Annotorious library is imported
- **Seamless Coordinate System**: Proper coordinate conversion between viewport and image space
- **Event Handling**: Built-in click handling for SVG elements
- **Memory Management**: Automatic cleanup and event handler management
- **TypeScript Support**: Full type safety and IntelliSense support

## Basic Usage

### With Annotorious

```typescript
import OpenSeadragon from 'openseadragon';
import { OpenSeadragonAnnotator } from '@annotorious/annotorious';

// Create OpenSeadragon viewer
const viewer = OpenSeadragon({
  id: 'viewer',
  tileSources: 'path/to/image.jpg'
});

// Initialize Annotorious (SVG overlay is automatically created)
const annotator = new OpenSeadragonAnnotator({
  viewer: viewer,
  imageUrl: 'path/to/image.jpg'
});

// Get the SVG overlay for custom elements
const svgOverlay = annotator.getSvgOverlay();
const overlayNode = svgOverlay.node();

// Add custom SVG elements
const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
rect.setAttribute('x', '100');
rect.setAttribute('y', '100');
rect.setAttribute('width', '200');
rect.setAttribute('height', '150');
rect.setAttribute('fill', 'red');
rect.setAttribute('opacity', '0.5');

overlayNode.appendChild(rect);

// Add click handler
svgOverlay.onClick(rect, (event) => {
  console.log('Rectangle clicked!', event);
});
```

### Standalone Usage

```typescript
import OpenSeadragon from 'openseadragon';
import { SvgOverlayPlugin } from '@annotorious/annotorious';

// Create OpenSeadragon viewer
const viewer = OpenSeadragon({
  id: 'viewer',
  tileSources: 'path/to/image.jpg'
});

// Get SVG overlay
const overlay = viewer.svgOverlay({
  className: 'my-overlay',
  enableClickHandling: true
});

const node = overlay.node();

// Add SVG elements
const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
circle.setAttribute('cx', '300');
circle.setAttribute('cy', '200');
circle.setAttribute('r', '50');
circle.setAttribute('fill', 'blue');

node.appendChild(circle);
```

## API Reference

### OpenSeadragonAnnotator Methods

#### `getSvgOverlay(): SvgOverlayInfo`
Returns the SVG overlay instance for external use.

#### `resizeSvgOverlay(): void`
Manually trigger a resize of the SVG overlay.

### SvgOverlayInfo Interface

```typescript
interface SvgOverlayInfo {
  /** Get the SVG element */
  svg(): SVGSVGElement;
  /** Get the main group node for adding elements */
  node(): SVGGElement;
  /** Manually trigger a resize/redraw */
  resize(): void;
  /** Add click handler to an SVG element */
  onClick(element: SVGElement, handler: (event: OpenSeadragon.MouseTrackerEvent) => void): void;
  /** Remove the overlay and clean up */
  destroy(): void;
}
```

### Configuration Options

```typescript
interface SvgOverlayConfig {
  /** Custom CSS class for the SVG element */
  className?: string;
  /** Whether to enable click handling on SVG elements */
  enableClickHandling?: boolean;
  /** Custom transform function for the SVG overlay */
  customTransform?: (viewport: OpenSeadragon.Viewport, containerSize: OpenSeadragon.Point) => string;
}
```

## Advanced Usage

### Custom Transform Function

```typescript
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
```

### Complex SVG Elements

```typescript
const svgOverlay = annotator.getSvgOverlay();
const node = svgOverlay.node();

// Create a complex SVG group
const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
group.setAttribute('class', 'custom-annotation');

// Add multiple elements to the group
const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
rect.setAttribute('x', '100');
rect.setAttribute('y', '100');
rect.setAttribute('width', '200');
rect.setAttribute('height', '100');
rect.setAttribute('fill', 'none');
rect.setAttribute('stroke', 'red');
rect.setAttribute('stroke-width', '2');

const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
text.setAttribute('x', '200');
text.setAttribute('y', '150');
text.setAttribute('text-anchor', 'middle');
text.setAttribute('fill', 'red');
text.textContent = 'Custom Annotation';

group.appendChild(rect);
group.appendChild(text);
node.appendChild(group);

// Add click handler to the entire group
svgOverlay.onClick(group, (event) => {
  console.log('Group clicked!', event);
});
```

### Dynamic Element Updates

```typescript
const svgOverlay = annotator.getSvgOverlay();
const node = svgOverlay.node();

// Create a dynamic element
const dynamicCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
dynamicCircle.setAttribute('cx', '300');
dynamicCircle.setAttribute('cy', '200');
dynamicCircle.setAttribute('r', '30');
dynamicCircle.setAttribute('fill', 'green');

node.appendChild(dynamicCircle);

// Update element properties dynamically
function updateCircle(x: number, y: number, radius: number, color: string) {
  dynamicCircle.setAttribute('cx', x.toString());
  dynamicCircle.setAttribute('cy', y.toString());
  dynamicCircle.setAttribute('r', radius.toString());
  dynamicCircle.setAttribute('fill', color);
}

// Example usage
setInterval(() => {
  const x = Math.random() * 600;
  const y = Math.random() * 400;
  const radius = 20 + Math.random() * 40;
  const colors = ['red', 'green', 'blue', 'yellow', 'purple'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  updateCircle(x, y, radius, color);
}, 2000);
```

## Integration with Existing Code

The SVG overlay plugin is automatically integrated into the Annotorious library. No changes are required to existing code - the plugin will work seamlessly with:

- Existing annotation tools
- Selection and editing functionality
- Theme management
- Crosshair functionality
- Touch support

## Performance Considerations

- The SVG overlay plugin is optimized for performance and only redraws when necessary
- Event handlers are properly managed to prevent memory leaks
- The plugin uses efficient coordinate transformations
- Large numbers of SVG elements are supported

## Browser Compatibility

- Modern browsers with SVG support
- TypeScript 4.0+
- OpenSeadragon 2.0+
- No additional dependencies required

## Troubleshooting

### Elements not appearing
- Ensure the SVG overlay is properly initialized
- Check that elements are being added to the correct node (`svgOverlay.node()`)
- Verify coordinate values are within the image bounds

### Elements not scaling properly
- The plugin handles scaling automatically
- If custom scaling is needed, use the `customTransform` option
- Ensure the viewport is properly configured

### Click events not working
- Verify `enableClickHandling` is set to `true`
- Check that the element has proper dimensions
- Ensure the element is not being covered by other elements

## Examples

See `example-integration.ts` for complete working examples of:

1. Integration with Annotorious
2. Standalone usage
3. Custom transform functions
4. Dynamic element updates
5. Complex SVG structures 