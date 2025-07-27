import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input, Output, EventEmitter, ChangeDetectorRef, AfterViewInit, NgZone } from '@angular/core';
import OpenSeadragon from 'openseadragon';
import { OpenSeadragonAnnotator } from '../core/annotator/OpenSeadragonAnnotator';
import { AnnotationEvent } from '../types/annotation.types';
import { Theme, lightTheme, darkTheme } from '../core/managers/StyleManager';

@Component({
  selector: 'lib-annotorious-openseadragon',
  templateUrl: './annotorious-openseadragon.component.html'
})
export class AnnotoriousOpenseadragonComponent implements OnInit, OnDestroy, AfterViewInit {
  private viewer!: OpenSeadragon.Viewer;
  private annotator!: OpenSeadragonAnnotator;
  @Input() viewerId: string = 'seadragon-viewer';
  @Input() pan: { panHorizontal: boolean; panVertical: boolean } = { panHorizontal: true, panVertical: true };
  @Input() zoom: { minZoomLevel: number; maxZoomLevel: number } = { minZoomLevel: 1, maxZoomLevel: 20 };
  @Input() showNavigationControl: boolean = false;
  @Input() showToolbar: boolean = false;
  @Input() imageSource: any = { type: 'image', url: 'https://images.pexels.com/photos/32920370/pexels-photo-32920370.jpeg' };
  @Input() theme: Theme = lightTheme;
  @Input() defaultTool: 'rectangle' | 'polygon' | 'circle' | 'ellipse' | 'freehand' | 'text' = 'rectangle';

  @Output() annotationCreated = new EventEmitter<AnnotationEvent>();
  @Output() annotationUpdated = new EventEmitter<AnnotationEvent>();
  @Output() annotationDeleted = new EventEmitter<AnnotationEvent>();
  @Output() annotationSelected = new EventEmitter<any>();
  @Output() annotationDeselected = new EventEmitter<any>();
  @Output() editingStarted = new EventEmitter<any>();
  @Output() editingStopped = new EventEmitter<any>();
  @Output() shapeMoved = new EventEmitter<any>();
  @Output() shapeResized = new EventEmitter<any>();
  @Output() annotatorReady = new EventEmitter<OpenSeadragonAnnotator>();

  tools: string[] = [];
  activeTool: string | null = null;

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit() {
    // Initialize OpenSeadragon viewer outside Angular zone
    this.ngZone.runOutsideAngular(() => {
      this.viewer = OpenSeadragon({
        id: this.viewerId,
        prefixUrl: 'assets/openseadragon/images/',
        tileSources: this.imageSource,
        defaultZoomLevel : 1,
        minZoomLevel: this.zoom.minZoomLevel,
        maxZoomLevel: this.zoom.maxZoomLevel,
        panHorizontal: true,
        panVertical: true,
        constrainDuringPan: true,
        showNavigationControl: this.showNavigationControl,
        gestureSettingsMouse: {
          clickToZoom: false,
          dblClickToZoom: false
        },
        visibilityRatio: 1,
      });
    });
  }

  ngAfterViewInit() {
    // Wait for OpenSeadragon to finish loading the image
    this.viewer.addHandler('open', () => {
      this.ngZone.runOutsideAngular(() => {
        // Use the OpenSeadragon viewer's canvas or container as the annotation container
        this.annotator = new OpenSeadragonAnnotator({
          viewer: this.viewer,
          theme: this.theme,
        });
        // Initialize toolbar tools and emit events inside Angular zone
        this.ngZone.run(() => {
          this.tools = this.annotator.getAvailableTools();
          this.activeTool = this.annotator.getActiveTool();
          this.cdr.detectChanges();
          
          // Emit annotator ready event
          this.annotatorReady.emit(this.annotator);
          
          // Add event listeners
          this.annotator.on('create', (evt: AnnotationEvent) => {
            this.annotationCreated.emit(evt);
          });
          this.annotator.on('update', (evt: AnnotationEvent) => {
            this.annotationUpdated.emit(evt);
          });
          this.annotator.on('delete', (evt: AnnotationEvent) => {
            this.annotationDeleted.emit(evt);
          });
          this.annotator.on('select', (evt: any) => {
            this.annotationSelected.emit(evt);
          });
          this.annotator.on('deselect', (evt: any) => {
            this.annotationDeselected.emit(evt);
          });
          this.annotator.on('editingStarted', (evt: any) => {
            this.editingStarted.emit(evt);
          });
          this.annotator.on('editingStopped', (evt: any) => {
            this.editingStopped.emit(evt);
          });
          this.annotator.on('shapeMoved', (evt: any) => {
            this.shapeMoved.emit(evt);
          });
          this.annotator.on('shapeResized', (evt: any) => {
            this.shapeResized.emit(evt);
          });
        });
      });
    });
  }

  activateTool(tool: string) {
    this.annotator.activateTool(tool);
    this.activeTool = tool;
  }

  ngOnDestroy() {
    // Clean up
    if (this.annotator) {
      this.annotator.destroy();
    }
    if (this.viewer) {
      this.viewer.destroy();
    }
  }

  // Method to get all current annotations
  getAnnotations(): any[] {
    return this.annotator.getAnnotations();
  }

  // Method to add a new annotation
  addAnnotation(annotation: any): void {
    this.annotator.addAnnotation(annotation);
  }

  // Method to remove an annotation
  removeAnnotation(annotationId: string): void {
    this.annotator.removeAnnotation(annotationId);
  }

  setAnnotations(annotations: any[]): void {
    this.annotator.setAnnotations(annotations);
  }

  setLabel(annotationId: string, label: string, position?: { x: number, y: number }): void {
    if (this.annotator) {
      this.annotator.setLabel(annotationId, label, position);
    }
  }

  removeLabel(annotationId: string): void {
    if (this.annotator) {
      this.annotator.removeLabel(annotationId);
    }
  }

  getAllAvailableTools(): string[] {
    return this.annotator.getAvailableTools();
  }
}
