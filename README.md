
#  OpenSeadragon Annotation Library

This library provides an annotation system on top of **OpenSeadragon** using an **SVG overlay**, offering tools for drawing and editing shapes, managing styles and themes, handling keyboard shortcuts, and performing hit-testing for smart selection and interaction on deep-zoom images.

It centers around **`OpenSeadragonAnnotator`**, which connects the overlay, state, tools, editing, and styling into a cohesive developer API.

---

## 📘 Overview

### Core

`OpenSeadragonAnnotator` manages:

* Lifecycle, rendering, selection, editing, styles, crosshair, and tool activation over an OpenSeadragon viewer.
* Methods to add, update, select, label, and show/hide annotations.

### Rendering

`SvgOverlay` provides an SVG `<svg>/<g>` overlay attached to the viewer canvas, supporting coordinate transforms between screen, SVG, and image spaces, and geometry conversions.

### Interaction

* **`ToolManager`** activates tools, translates pointer events to overlay coordinates, and controls drawing mode.
* **`EditManager`** enables selection, dragging, vertex manipulation, and label movement with bounds clamping.

### Shapes and Styles

* **`BaseShape`** defines a common interface (geometry, selection, handles, labels).
* Extended by shapes such as `PolygonShape`.
* **`StyleManager`** computes theme-aware styles, zoom-aware handle sizes, and contrast-optimized colors.

### Utilities

* **`SVGUtils`** provides geometry and DOM helpers plus coordinate conversions.
* **`HitDetection`** performs per-geometry boundary hit tests for smart selection.

---

## ⚙️ Installation

1. Install OpenSeadragon and include this library in your TypeScript or JavaScript project.
2. Ensure an `OpenSeadragon.Viewer` instance is available before constructing `OpenSeadragonAnnotator`.
3. The SVG overlay automatically mounts to `viewer.canvas` and updates on viewer events (open, zoom, pan, rotate, flip).
4. Styles and themes are injected dynamically via `StyleManager`; no external CSS is required.

---

## 🚀 Getting Started

```ts
import OpenSeadragon from 'openseadragon';
import { OpenSeadragonAnnotator } from '...';

const viewer = new OpenSeadragon.Viewer({
  id: 'openseadragon',
  tileSources: '...'
});

const annotator = new OpenSeadragonAnnotator({
  viewer,
  toolType: 'rectangle',   // default tool
  autoSave: true,           // apply edits immediately
  crosshair: true,          // show crosshair
  imageUrl: 'https://example.com/image.tif'
});

// Activate a tool
annotator.activateTool('polygon');

// Add a programmatic annotation
annotator.addAnnotation({
  id: 'a1',
  type: 'Annotation',
  body: [],
  target: {
    source: 'https://example.com/image.tif',
    selector: {
      type: 'SvgSelector',
      geometry: { type: 'polygon', points: [{ x:10, y:10 }, { x:50, y:50 }] }
    }
  },
  style: { stroke: '#f00', strokeWidth: 3 }
});

// Select and edit
annotator.selectAnnotation('a1');
```

---

## 🧩 Concepts

* **Coordinate systems:** `SvgOverlay` supplies conversions between screen, SVG, and image spaces.
* **Geometry types:** `rectangle`, `polygon`, `circle`, `ellipse`, `text`, `line`, `point`, `polyline-arrow`.
* **Zoom-aware styling:** Handle sizes and line widths scale with zoom.
* **Editing model:** `EditManager` supports moving shapes, editing vertices, and dragging labels.

---

## 🧱 Key Classes

### OpenSeadragonAnnotator

* **Responsibilities:**
  Initializes managers, subscribes to viewer events, maintains state, and emits events like `create`, `update`, `delete`, `select`, and `deselect`.
* **Persistence:**
  Stores geometries in image coordinates for fidelity across zoom and transformations.

### SvgOverlay

* Mounts an SVG under `viewer.canvas`.
* Manages transforms for zoom, rotation, and flipping.
* Provides coordinate conversions and geometry conversion to image space.

### ToolManager

* Registers and activates tools.
* Routes pointer events and controls drawing mode.
* Emits `drawingStarted`, `drawingStopped`, and error events.

### EditManager

* Enables selection and editing.
* Handles drag contexts for shapes, handles, and labels.
* Emits geometry update events and clamps movement to image bounds.

### BaseShape & PolygonShape

* `BaseShape`: Core structure for shapes with elements for main geometry, selection outline, handles, and labels.
* `PolygonShape`: Manages vertices, movement, and boundary hit detection.

### StyleManager

* Manages light/dark themes and zoom-aware styling.
* Computes contrast-based colors, handle sizes, and stroke widths.
* Provides APIs for custom and per-annotation styles.

### SVGUtils & HitDetection

* `SVGUtils`: Geometry creation, centroid, transforms, text width estimation, and bounding boxes.
* `HitDetection`: Boundary-based hit testing for all geometry types.

---

## 🧾 Data Model

**Annotation:**

```ts
{
  id: string;
  type: 'Annotation';
  body: AnnotationBody[];
  target: {
    source: string;
    selector: { type: 'SvgSelector'; geometry: Geometry };
  };
  label?: TextGeometry;
  style?: PartialShapeStyle;
}
```

**Geometry Types:**
`polygon`, `rectangle`, `circle`, `ellipse`, `line`, `point`, `text`, `polyline-arrow`.

---

## 🎯 Events

* **Annotator:** `create`, `update`, `delete`, `select`, `deselect`, `context-menu`, `labelRemoved`.
* **ToolManager:** `toolActivated`, `toolDeactivated`, `drawingStarted`, `drawingStopped`, `error`.
* **EditManager:** `editingStarted`, `editingDragStarted`, `editingDragStopped`, `updateGeometry`.

---

## 🧰 Common Tasks

| Task              | Method                                                        |
| ----------------- | ------------------------------------------------------------- |
| Activate a tool   | `annotator.activateTool('polygon')`                           |
| Add/update/remove | `addAnnotation()`, `updateAnnotation()`, `removeAnnotation()` |
| Select/edit       | `selectAnnotation(id)`, `saveShapeChanges(id)`                |
| Label management  | `setLabel(id, text, {x,y}?)`, `removeLabel(id)`               |
| Visibility        | `hideAnnotations(ids)`, `showAnnotations(ids)`                |

---

## 🧮 Coordinate Conversion & Rendering

* Displayed in viewport coordinates, stored in image coordinates.
* `SvgOverlay.convertSvgGeometryToImage()` converts drawn geometry to image space.
* Non-scaling strokes ensure consistent handle and outline sizes across zooms.

---

## 🎯 Hit Detection & Smart Selection

* Click events are translated to image coordinates.
* `HitDetection` computes distances and finds the topmost hit annotation.
* Text hit detection uses refined bounds for accuracy.

---

## ⌨️ Keyboard & Crosshair

* **KeyboardManager:**

  * `Delete` → remove selected shape
  * `Escape` → clear selection or editing
* **Crosshair:**

  * Enabled via config or dynamically toggled with tool activation.

---

## 🎨 Styling & Themes

* Switch themes with `annotator.setTheme(theme)`.
* Override styles with `setAnnotationStyle(id, style)`.
* `StyleManager` injects dynamic `<style>` into SVG overlay and updates on zoom or theme changes.

---

## 🧭 API Reference (Selected)

### OpenSeadragonAnnotator

```ts
addAnnotation(annotation)
updateAnnotation(id, partial)
removeAnnotation(id)
getAnnotations()
selectAnnotation(id)
clearSelectionAndEditing()
saveShapeChanges(id)
activateTool(name)
setAnnotationStyle(id, style)
setTheme(theme)
getTheme()
hideAnnotations(ids)
showAnnotations(ids)
getSvgOverlay()
resizeSvgOverlay()
destroy()
```

### SvgOverlay

```ts
screenToImage(x, y)
imageToScreen(x, y)
eventToImage(evt)
screenToSvg(x, y)
svgToImage(x, y)
convertSvgGeometryToImage(geometry)
```

### ToolManager

```ts
registerTool(tool)
activateTool(name)
deactivateActiveTool()
startDrawing()
stopDrawing()
isDrawing()
```

### EditManager

```ts
startEditing(id, shape)
stopEditing()
isEditing()
getCurrentEditingEntity()
```

---

## ⚠️ Error Handling & Constraints

* Invalid tool registrations or activation names trigger `error` events.
* Editing is clamped to image bounds.
* Label or selection actions on absent shapes throw descriptive errors.
* Selection raises shape’s SVG group to top for proper z-order.

---

## 🧩 Extending the Library

### Custom Shapes

Subclass `BaseShape` and implement:

* `update(geometry)`
* `getGeometry()`
* `getEditHandles()`
* `moveBy()`
* Style and outline updates

### Custom Tools

Implement a `Tool` with:

* `name`
* `supportsMouse`
* Handlers: `handleMouseDown`, `handleMouseMove`, `handleMouseUp`, `handleDoubleClick`

### Styling

Define custom themes with shape defaults and register them via `StyleManager.setTheme()`.

---

## 🧹 Cleanup

Call `annotator.destroy()` to:

* Remove all event handlers
* Detach overlay
* Clear internal state
* Tear down `StyleManager`, `ToolManager`, `KeyboardManager`, `Crosshair`, and `EditManager`.

---

## 🧑‍💻 Notes for Contributors

* Persist geometries in **image coordinates** only.
* Use **non-scaling strokes** for consistency.
* Estimate text width via `SVGUtils.estimateTextWidth`.
* When adding geometry types, update:

  * `SvgOverlay.convertSvgGeometryToImage`
  * `SVGUtils.getAnnotationBBox`
  * `HitDetection.hitTest`
  * Shape classes

