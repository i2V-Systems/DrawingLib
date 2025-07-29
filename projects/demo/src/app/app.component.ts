import { Component, ViewChild, NgZone } from '@angular/core';
import { AnnotationEvent } from '../../../annotorious/src/lib/types/annotation.types';
import { darkTheme, ShapeStyle } from '../../../annotorious/src/lib/core/managers/StyleManager';
import { AnnotoriousOpenseadragonComponent } from '../../../annotorious/src/lib/angular/annotorious-openseadragon.component';
import demoAnnotations from '../../public/demo-annotations.json';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(private ngZone: NgZone) {}

  title = 'demo';
  dziUrl = { type: 'image', url : '/demo2.jpg'};
  theme = darkTheme;
  tools: string[] = [];
  currentTool: string = 'rectangle';

  setTool(tool: string) {
    this.currentTool = tool;
    if (this.annotoriousComp) {
      this.annotoriousComp.activateTool(tool);
    }
  }

  ngOnInit() {
  }

  @ViewChild(AnnotoriousOpenseadragonComponent)
  annotoriousComp!: AnnotoriousOpenseadragonComponent;

  onAnnotationCreated(event: AnnotationEvent) {
    console.log('Annotation created:', event);
  }

  onAnnotationUpdated(event: AnnotationEvent) {
    console.log('Annotation updated:', event);
  }

  onAnnotationDeleted(event: AnnotationEvent) {
    console.log('Annotation deleted:', event);
  }

  onContextMenuClicked(event: any) {
    this.ngZone.run(() => {
      this.annotoriousComp.changeArrowDirection(event.startIndex, event.endIndex, "both");
    })
  }
  selectedAnnotationId: string | null = null;
  currentLabel: string = '';
  currentColor: string = '#ff0000';
  currentStrokeWidth: number = 2;

  onAnnotationSelected(event: any) {
    console.log('Annotation selected:', event);
    // Use NgZone to ensure change detection runs
    this.ngZone.run(() => {
      this.selectedAnnotationId = event.annotation?.id || event.id;
      console.log('Selected ID set to:', this.selectedAnnotationId);
      
      // Get current annotation properties if available
      if (event.annotation) {
        this.currentLabel = event.annotation.label || '';
        this.currentColor = event.annotation.style?.stroke || '#ff0000';
        this.currentStrokeWidth = event.annotation.style?.strokeWidth || 2;
      }
    });
  }

  onAnnotationDeselected(event: any) {
    console.log('Annotation deselected:', event);
    // Use NgZone to ensure change detection runs
    this.ngZone.run(() => {
      this.selectedAnnotationId = null;
      console.log('Selected ID cleared');
    });
  }

  onLabelChange(value: string) {
    this.currentLabel = value;
  }

  onColorChange(value: string) {
    this.currentColor = value;
  }

  setLabel() {
    if (this.selectedAnnotationId) {
      this.annotoriousComp.setLabel(this.selectedAnnotationId, this.currentLabel);
    }
  }

  setColor() {
    if (this.selectedAnnotationId && this.currentColor) {
      this.annotoriousComp.setAnnotationStyle(this.selectedAnnotationId, { stroke: this.currentColor });
    }
  }


  onStrokeWidthChange(width: number) {
    this.currentStrokeWidth = width;
  }

  setStrokeWidth() {
    if (this.selectedAnnotationId) {
      this.annotoriousComp.setAnnotationStyle(this.selectedAnnotationId, { strokeWidth: this.currentStrokeWidth });
    }
  }

  removeSelectedLabel() {
    if (this.selectedAnnotationId) {
      this.annotoriousComp.removeLabel(this.selectedAnnotationId);
    }
  }

  onEditingStarted(event: any) {
    console.log('Editing started:', event);
  }

  onEditingStopped(event: any) {
    console.log('Editing stopped:', event);
  }

  onShapeMoved(event: any) {
    console.log('Shape moved:', event);
  }

  onShapeResized(event: any) {
    console.log('Shape resized:', event);
  }

  onLabelSelected(event: any) {
    console.log('Label selected:', event);
  }

  onAnnotatorReady(annotator: any) {
    // Initialize tools once annotator is ready
    this.tools = annotator.getAvailableTools();
    // Set initial annotations
    this.annotoriousComp.setAnnotations(demoAnnotations);
  }
}