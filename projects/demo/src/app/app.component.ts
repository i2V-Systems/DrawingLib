import { Component, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AnnotoriousOpenseadragonModule } from '../../../annotorious/src/public-api';
import { AnnotationEvent } from '../../../annotorious/src/lib/types/annotation.types';
import { darkTheme } from '../../../annotorious/src/lib/core/managers/StyleManager';
import { AnnotoriousOpenseadragonComponent } from '../../../annotorious/src/lib/angular/annotorious-openseadragon.component';
import demoAnnotations from '../../public/demo-annotations.json';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AnnotoriousOpenseadragonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(private ngZone: NgZone) {}

  title = 'demo';
  dziUrl = { type: 'image', url : '/demo.jpg'};
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
    // Tools will be initialized when annotator is ready
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

  selectedAnnotationId: string | null = null;

  onAnnotationSelected(event: any) {
    console.log('Annotation selected:', event);
    // Use NgZone to ensure change detection runs
    this.ngZone.run(() => {
      this.selectedAnnotationId = event.annotation?.id || event.id;
      console.log('Selected ID set to:', this.selectedAnnotationId);
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

  addLabelToSelected() {
    if (this.selectedAnnotationId) {
      // Add a basic label
      this.annotoriousComp.setLabel(this.selectedAnnotationId, 'Test Label');
    }
  }

  addCustomPositionLabel() {
    if (this.selectedAnnotationId) {
      // Add a label with custom position
      this.annotoriousComp.setLabel(
        this.selectedAnnotationId, 
        'Custom Position Label',
        { x: 100, y: 50 }
      );
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
