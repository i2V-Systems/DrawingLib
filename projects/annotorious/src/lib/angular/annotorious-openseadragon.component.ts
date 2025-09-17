import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  AfterViewInit,
  NgZone,
} from '@angular/core';
import OpenSeadragon from 'openseadragon';
import { OpenSeadragonAnnotator } from '../core/annotator/OpenSeadragonAnnotator';
import { Annotation, AnnotationEvent } from '../types/annotation.types';
import {
  Theme,
  lightTheme,
  darkTheme,
  ShapeStyle,
} from '../core/managers/StyleManager';
import { Tool } from '../tools';

@Component({
  selector: 'lib-annotorious-openseadragon',
  templateUrl: './annotorious-openseadragon.component.html',
  styleUrls: [
    './annotorious-openseadragon.component.scss'
  ],
})
export class AnnotoriousOpenseadragonComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  private viewer!: OpenSeadragon.Viewer;
  private annotator!: OpenSeadragonAnnotator;
  @Input() viewerId: string = 'seadragon-viewer';
  @Input() pan: { panHorizontal: boolean; panVertical: boolean } = {
    panHorizontal: true,
    panVertical: true,
  };
  @Input() zoom: { minZoomLevel: number; maxZoomLevel: number } = {
    minZoomLevel: 1,
    maxZoomLevel: 20,
  };
  @Input() showNavigationControl: boolean = false;
  @Input() imageSource: any;
  @Input() theme: Theme = lightTheme;
  @Input() defaultTool:
    | 'rectangle'
    | 'polygon'
    | 'circle'
    | 'ellipse'
    | 'freehand'
    | 'text' = 'rectangle';

  @Output() annotationCreated = new EventEmitter<AnnotationEvent>();
  @Output() annotationUpdated = new EventEmitter<AnnotationEvent>();
  @Output() annotationDeleted = new EventEmitter<AnnotationEvent>();
  @Output() annotationSelected = new EventEmitter<any>();
  @Output() annotationDeselected = new EventEmitter<any>();
  @Output() annotatorReady = new EventEmitter<OpenSeadragonAnnotator>();
  @Output() contextMenuClicked = new EventEmitter<any>();
  @Output() OsdViewerReady = new EventEmitter<OpenSeadragon.Viewer>();

  tools: string[] = [];
  activeTool: string | null = null;

  private annotatorReadyPromise: Promise<OpenSeadragonAnnotator>;
  private annotatorReadyResolve!: (annotator: OpenSeadragonAnnotator) => void;
  private isAnnotatorReady = false;

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {
    this.annotatorReadyPromise = new Promise((resolve) => {
      this.annotatorReadyResolve = resolve;
    });
  }

  // Add readiness check method
  public isReady(): boolean {
    return this.isAnnotatorReady && !!this.annotator;
  }

  // Add promise access method
  public whenReady(): Promise<OpenSeadragonAnnotator> {
    return this.annotatorReadyPromise;
  }

  ngAfterViewInit() {
    this.viewer.addHandler('open', () => {
      this.updateViewerSize();
      this.ngZone.runOutsideAngular(() => {
        if (this.annotator) {
          console.log('Destroying existing annotator instance');
          this.annotator.destroy();
          this.annotator = null as any;
          this.isAnnotatorReady = false;
        }
        this.annotator = new OpenSeadragonAnnotator({
          viewer: this.viewer,
          theme: this.theme,
        });

        // Add event listeners outside Angular zone for performance
        this.annotator.on('create', (evt: any) => {
          this.ngZone.run(() => {
            this.annotationCreated.emit(evt);
          });
        });

        this.annotator.on('delete', (evt: any) => {
          this.ngZone.run(() => {
            this.annotationDeleted.emit(evt);
            this.cdr.detectChanges();
          });
        });

        this.annotator.on('update', (evt: any) => {
          this.ngZone.run(() => {
            this.annotationUpdated.emit(evt);
            this.cdr.detectChanges();
          });
        });

        this.annotator.on('select', (evt: any) => {
          this.ngZone.run(() => {
            this.annotationSelected.emit(evt);
            this.cdr.detectChanges();
          });
        });

        this.annotator.on('deselect', (evt: any) => {
          this.ngZone.run(() => {
            this.annotationDeselected.emit(evt);
            this.cdr.detectChanges();
          });
        });

        this.annotator.on('context-menu', (evt: any) => {
          this.ngZone.run(() => {
            this.contextMenuClicked.emit(evt);
            this.cdr.detectChanges();
          });
        });

        // Small delay to ensure complete initialization
        setTimeout(() => {
          this.ngZone.run(() => {
            // Initialize tools and ready state
            this.tools = this.annotator.getAvailableTools();
            this.activeTool = this.annotator.getActiveTool();
            this.isAnnotatorReady = true;

            // Resolve promise and emit ready event
            this.annotatorReadyResolve(this.annotator);
            this.annotatorReady.emit(this.annotator);
            this.cdr.detectChanges();
          });
        }, 100);
      });
    });

    this.viewer.addHandler('resize', this.updateViewerSize.bind(this));
    document.addEventListener(
      'DOMContentLoaded',
      this.updateViewerSize.bind(this)
    );
  }

  ngOnInit() {
    // Initialize OpenSeadragon viewer outside Angular zone
    this.ngZone.runOutsideAngular(() => {
      this.viewer = OpenSeadragon({
        id: this.viewerId,
        prefixUrl: 'assets/openseadragon/images/',
        tileSources: {
          type: 'image',
          url: this.imageSource,
        },
        defaultZoomLevel: 1,
        minZoomLevel: this.zoom.minZoomLevel,
        maxZoomLevel: this.zoom.maxZoomLevel,
        panHorizontal: true,
        panVertical: true,
        constrainDuringPan: true,
        showNavigationControl: this.showNavigationControl,
        gestureSettingsMouse: {
          clickToZoom: false,
          dblClickToZoom: false,
        },
        visibilityRatio: 1,
      });
      this.viewer.addHandler('open', () => {
        this.ngZone.run(() => {
          this.OsdViewerReady.emit(this.viewer);
          this.cdr.detectChanges();
        });
      });
    });
  }

  updateViewerSize = () => {
    const viewerElement = document.getElementById(this.viewerId);
    if (!viewerElement) return;

    const parentHeight =
      viewerElement.parentElement?.clientHeight || window.innerHeight;
    const imgWidth = 640; // Update with dynamic width if needed
    const imgHeight = 480;
    const aspectRatio = imgWidth / imgHeight;
    const calculatedWidth = parentHeight * aspectRatio;

    viewerElement.style.height = '100%';
    viewerElement.style.width = `${calculatedWidth}px`;

    if (this.annotator) {
      this.annotator.resizeSvgOverlay();

      const newBounds = this.annotator.getSvgOverlay().getContainerSize();
      Tool.setContainerBound(newBounds);
    }
  };

  ngOnDestroy() {
    // Clean up
    if (this.annotator) {
      this.annotator.destroy();
    }
    if (this.viewer) {
      this.viewer.destroy();
    }

    window.removeEventListener('resize', this.updateViewerSize);
    document.removeEventListener('DOMContentLoaded', this.updateViewerSize);
  }

  getAnnotations(): any[] {
    return this.annotator ? this.annotator.getAnnotations() : [];
  }

  getAnnotationById(id: string): Annotation | null {
    return this.annotator
      ? this.annotator.getAnnotations().find((a) => a.id === id) || null
      : null;
  }

  activateTool(
    tool: string,
    stroke?: string,
    strokeWidth?: number,
    labelText?: string,
    group?: string
  ): void {
    this.ngZone.run(() => {
      if (this.annotator) {
        this.annotator.activateTool(tool);
        if (labelText || stroke || strokeWidth) {
          this.annotator.pendingLabelText = labelText;
          this.annotator.pendingStyle = {
            stroke: stroke,
            strokeWidth: strokeWidth,
          } as ShapeStyle;
          this.annotator.pendingAnnotationBody = {
            type: 'TextualBody',
            purpose: 'classifying',
            value: `${group}`,
          };
        }
        this.activeTool = tool;
        this.cdr.detectChanges();
      }
    });
  }

  // annotorious-openseadragon.component.ts
  setAnnotations(annotations: any[]): void {
    this.ngZone.run(() => {
      if (this.annotator) {
        this.annotator.loadAnnotations(annotations);
        this.cdr.detectChanges();
      }
    });
  }

  addAnnotation(annotation: any): void {
    this.ngZone.run(() => {
      if (this.annotator) {
        this.annotator.addAnnotation(annotation);
        this.cdr.detectChanges();
      }
    });
  }

  removeAnnotation(annotationId: string): void {
    this.ngZone.run(() => {
      if (this.annotator) {
        this.annotator.removeAnnotation(annotationId);
        this.cdr.detectChanges();
      }
    });
  }

  removeAllAnnotations(): void {
    this.ngZone.run(() => {
      if (this.annotator) {
        this.annotator.getAnnotations().forEach((annotation) => {
          this.annotator.removeAnnotation(annotation.id);
        });
        this.cdr.detectChanges();
      }
    });
  }

  setLabel(
    annotationId: string,
    label: string,
    position?: { x: number; y: number }
  ): void {
    this.ngZone.run(() => {
      if (this.annotator) {
        this.annotator.setLabel(annotationId, label, position);
        this.cdr.detectChanges();
      }
    });
  }

  changeArrowDirection(
    startIndex: number,
    endIndex: number,
    direction: 'up' | 'down' | 'both'
  ): void {
    this.ngZone.run(() => {
      if (this.annotator) {
        this.annotator.changeArrowDirection(startIndex, endIndex, direction);
        this.cdr.detectChanges();
      }
    });
  }

  setAnnotationStyle(annotationId: string, style: Partial<ShapeStyle>): void {
    this.ngZone.run(() => {
      if (this.annotator) {
        this.annotator.setAnnotationStyle(annotationId, style);
        this.cdr.detectChanges();
      }
    });
  }

  removeLabel(annotationId: string): void {
    this.ngZone.run(() => {
      if (this.annotator) {
        this.annotator.removeLabel(annotationId);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Save changes made to the currently selected shape
   * This commits temporary editing changes to the annotation data
   */
  public saveSelectedShapeChanges(): boolean {
    return this.ngZone.run(() => {
      if (this.annotator) {
        const success = this.annotator.saveSelectedShapeChanges();
        this.cdr.detectChanges();
        return success;
      }
      return false;
    });
  }

  /**
   * Save changes for a specific shape by ID
   */
  public saveShapeChanges(annotationId: string): boolean {
    return this.ngZone.run(() => {
      if (this.annotator) {
        const success = this.annotator.saveShapeChanges(annotationId);
        this.cdr.detectChanges();
        return success;
      }
      return false;
    });
  }

  /**
   * Hide multiple annotations
   */
  hideAnnotations(annotationIds: string[]): void {
    this.ngZone.run(() => {
      if (this.annotator) {
        this.annotator.hideAnnotations(annotationIds);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Show multiple annotations
   */
  showAnnotations(annotationIds: string[]): void {
    this.ngZone.run(() => {
      if (this.annotator) {
        this.annotator.showAnnotations(annotationIds);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Check if annotation is visible
   */
  isAnnotationVisible(annotationId: string): boolean {
    return this.annotator
      ? this.annotator.isAnnotationVisible(annotationId)
      : false;
  }

  getAllAvailableTools(): string[] {
    // Synchronous getter - no zone management needed
    return this.annotator ? this.annotator.getAvailableTools() : [];
  }
}
