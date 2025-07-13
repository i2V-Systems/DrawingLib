# Annotorious - OpenSeadragon Integration

A simplified annotation library for OpenSeadragon with crosshair support.

## Installation

```bash
npm install @your-org/annotorious
```

## Basic Usage

```typescript
import OpenSeadragon from 'openseadragon';
import { OpenSeadragonAnnotator } from '@your-org/annotorious';

// Create OpenSeadragon viewer
const viewer = OpenSeadragon({
  id: 'viewer',
  prefixUrl: '/openseadragon/images/',
  tileSources: 'path/to/your/image.jpg'
});

// Create annotator with crosshair
const annotator = new OpenSeadragonAnnotator({
  container: document.getElementById('viewer'),
  viewer: viewer,
  crosshair: true, // Enable crosshair with default settings
  toolType: 'rectangle'
});

// Start drawing
annotator.startDrawing('rectangle');
```

## Crosshair Configuration

### Basic Crosshair
```typescript
const annotator = new OpenSeadragonAnnotator({
  container: document.getElementById('viewer'),
  viewer: viewer,
  crosshair: true // Simple boolean
});
```

### Custom Crosshair
```typescript
const annotator = new OpenSeadragonAnnotator({
  container: document.getElementById('viewer'),
  viewer: viewer,
  crosshair: {
    enabled: true,
    showOnlyWhenDrawing: true, // Only show during drawing mode
    color: 'rgba(255, 0, 0, 0.7)',
    strokeWidth: 2,
    opacity: 0.7
  }
});
```

### Runtime Crosshair Control
```typescript
// Enable/disable crosshair
annotator.enableCrosshair();
annotator.disableCrosshair();

// Change configuration
annotator.setCrosshairConfig({
  color: 'blue',
  strokeWidth: 3
});

// Check status
if (annotator.isCrosshairEnabled()) {
  console.log('Crosshair is active');
}
```

## API Reference

### OpenSeadragonAnnotator

#### Constructor Options
- `container`: HTMLElement - The container element
- `viewer`: OpenSeadragon.Viewer - The OpenSeadragon viewer instance
- `toolType`: string - Default tool type ('rectangle', 'polygon', etc.)
- `crosshair`: boolean | CrosshairConfig - Crosshair configuration
- `enableKeyboard`: boolean - Enable keyboard shortcuts
- `theme`: Theme - Visual theme configuration

#### Methods
- `startDrawing(toolType?)`: Start drawing mode
- `stopDrawing()`: Stop drawing mode
- `addAnnotation(annotation)`: Add an annotation
- `removeAnnotation(id)`: Remove an annotation
- `getAnnotations()`: Get all annotations
- `selectAnnotation(id)`: Select an annotation
- `clearSelection()`: Clear current selection
- `enableCrosshair()`: Enable crosshair
- `disableCrosshair()`: Disable crosshair
- `setCrosshairConfig(config)`: Update crosshair configuration
- `isCrosshairEnabled()`: Check if crosshair is enabled
- `destroy()`: Clean up resources

### CrosshairConfig

```typescript
interface CrosshairConfig {
  enabled?: boolean;           // Enable/disable crosshair
  showOnlyWhenDrawing?: boolean; // Show only during drawing mode
  color?: string;              // Crosshair color
  strokeWidth?: number;        // Line width
  opacity?: number;            // Line opacity
}
```

## Features

✅ **Simplified Architecture**: Direct OpenSeadragon integration  
✅ **Crosshair Support**: Visual precision aid during drawing  
✅ **Drawing Mode Only**: Crosshair shows only when needed  
✅ **Customizable**: Color, width, opacity, behavior  
✅ **Tool Management**: Multiple drawing tools supported  
✅ **Event System**: Comprehensive event handling  
✅ **Keyboard Shortcuts**: Built-in keyboard controls  
✅ **Touch Device Support**: Automatic touch detection and translation  

## Touch Device Support

The annotator automatically detects touch devices and provides optimized touch interactions:

### **Automatic Detection**
```typescript
import { isTouchDevice } from '@your-org/annotorious';

if (isTouchDevice()) {
  console.log('Touch device detected');
}
```

### **Touch Features**
- **Touch Event Translation**: Converts touch events to mouse events for compatibility
- **Press and Hold**: Long press (800ms) simulates double-click for polygon completion
- **Touch-Friendly UI**: Larger touch targets and optimized interactions
- **Prevent Zoom**: Prevents accidental zoom on double-tap
- **No Text Selection**: Prevents text selection during annotation

### **Touch-Specific Behavior**
- **Larger Touch Targets**: Minimum 20px touch areas for better usability
- **Optimized Hover States**: Touch-friendly visual feedback
- **Gesture Support**: Works with OpenSeadragon's built-in gesture handling

### **Manual Touch Translation**
```typescript
import { enableTouchTranslation } from '@your-org/annotorious';

// Enable touch translation on any element
enableTouchTranslation(document.getElementById('my-element'));
```

## License

MIT
