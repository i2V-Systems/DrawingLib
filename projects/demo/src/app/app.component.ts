import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnnotoriousOpenseadragonModule } from '../../../annotorious/src/public-api';
import { AnnotationEvent } from '../../../annotorious/src/lib/types/annotation.types';
import { darkTheme } from '../../../annotorious/src/lib/core/style/StyleManager';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AnnotoriousOpenseadragonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'demo';
  dziUrl = { type: 'image', url : 'https://images.pexels.com/photos/32920370/pexels-photo-32920370.jpeg'};
  theme = darkTheme;

  onAnnotationCreated(event: AnnotationEvent) {
    console.log('Annotation created:', event);
  }

  onAnnotationUpdated(event: AnnotationEvent) {
    console.log('Annotation updated:', event);
  }

  onAnnotationDeleted(event: AnnotationEvent) {
    console.log('Annotation deleted:', event);
  }
}
