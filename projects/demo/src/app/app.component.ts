import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnnotoriousOpenseadragonModule } from '../../../annotorious/src/public-api';
import { AnnotationEvent } from '../../../annotorious/src/lib/types/annotation.types';
import { darkTheme } from '../../../annotorious/src/lib/core/style/StyleManager';
import { AnnotoriousOpenseadragonComponent } from '../../../annotorious/src/lib/angular/annotorious-openseadragon.component';
import demoAnnotations from '../../public/demo-annotations.json';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AnnotoriousOpenseadragonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'demo';
  dziUrl = { type: 'image', url : '/demo.jpg'};
  theme = darkTheme;

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

  onAnnotationSelected(event: any) {
    console.log('Annotation selected:', event);
  }

  onAnnotationDeselected(event: any) {
    console.log('Annotation deselected:', event);
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

  ngAfterViewInit() {
    // Wait a tick to ensure annotoriousComp is available
    setTimeout(() => {
      if (this.annotoriousComp) {
        this.annotoriousComp.setAnnotations(demoAnnotations);
        // for (const ann of demoAnnotations) {
        //   this.annotoriousComp.addAnnotation(ann);
        // }
      }
    }, 300);
  }
}
