import { EventEmitter } from '../events/EventEmitter';
import { Annotation } from '../annotation/types';


export interface AnnotationGroup {
  id: string;
  name: string;
  annotations: string[]; // Array of annotation IDs
  color?: string;
  metadata?: Record<string, any>;
  created?: Date;
  modified?: Date;
}

export interface GroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Manages annotation groups
 */
export class GroupManager extends EventEmitter {
  private groups: Map<string, AnnotationGroup>;
  private annotations: Map<string, Annotation>;
  private groupElements: Map<string, SVGGElement>;
  private svg: SVGSVGElement;
  private selectedGroup: string | null = null;

  constructor(svg: SVGSVGElement) {
    super();
    this.svg = svg;
    this.groups = new Map();
    this.annotations = new Map();
    this.groupElements = new Map();
  }

  /**
   * Create a new group
   */
  createGroup(name: string, annotationIds: string[], options: Partial<AnnotationGroup> = {}): string {
    const id = crypto.randomUUID();
    const group: AnnotationGroup = {
      id,
      name,
      annotations: annotationIds,
      color: options.color,
      metadata: options.metadata || {},
      created: new Date(),
      modified: new Date()
    };

    this.groups.set(id, group);
    this.createGroupElement(id);
    this.updateGroupVisuals(id);

    this.emit('groupCreated', { group });
    return id;
  }

  /**
   * Delete a group
   */
  deleteGroup(id: string): void {
    const group = this.groups.get(id);
    if (group) {
      this.groups.delete(id);
      const element = this.groupElements.get(id);
      if (element) {
        this.svg.removeChild(element);
        this.groupElements.delete(id);
      }
      this.emit('groupDeleted', { group });
    }
  }

  /**
   * Add annotations to a group
   */
  addToGroup(groupId: string, annotationIds: string[]): void {
    const group = this.groups.get(groupId);
    if (group) {
      const newIds = annotationIds.filter(id => !group.annotations.includes(id));
      if (newIds.length > 0) {
        group.annotations.push(...newIds);
        group.modified = new Date();
        this.updateGroupVisuals(groupId);
        this.emit('groupUpdated', { group, added: newIds });
      }
    }
  }

  /**
   * Remove annotations from a group
   */
  removeFromGroup(groupId: string, annotationIds: string[]): void {
    const group = this.groups.get(groupId);
    if (group) {
      const originalLength = group.annotations.length;
      group.annotations = group.annotations.filter(id => !annotationIds.includes(id));
      if (group.annotations.length !== originalLength) {
        group.modified = new Date();
        this.updateGroupVisuals(groupId);
        this.emit('groupUpdated', { group, removed: annotationIds });
      }
    }
  }

  /**
   * Track an annotation
   */
  trackAnnotation(annotation: Annotation): void {
    this.annotations.set(annotation.id, annotation);
    this.updateAffectedGroups([annotation.id]);
  }

  /**
   * Untrack an annotation
   */
  untrackAnnotation(id: string): void {
    this.annotations.delete(id);
    this.updateAffectedGroups([id]);
  }

  /**
   * Update tracked annotation
   */
  updateAnnotation(id: string, annotation: Annotation): void {
    this.annotations.set(id, annotation);
    this.updateAffectedGroups([id]);
  }

  /**
   * Get group by ID
   */
  getGroup(id: string): AnnotationGroup | undefined {
    return this.groups.get(id);
  }

  /**
   * Get all groups
   */
  getGroups(): AnnotationGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get groups containing an annotation
   */
  getGroupsForAnnotation(annotationId: string): AnnotationGroup[] {
    return this.getGroups().filter(group => 
      group.annotations.includes(annotationId)
    );
  }

  /**
   * Select a group
   */
  selectGroup(id: string | null): void {
    if (this.selectedGroup !== id) {
      // Remove previous selection
      if (this.selectedGroup) {
        const prevElement = this.groupElements.get(this.selectedGroup);
        if (prevElement) {
          prevElement.classList.remove('selected');
        }
      }

      this.selectedGroup = id;

      // Add new selection
      if (id) {
        const element = this.groupElements.get(id);
        if (element) {
          element.classList.add('selected');
        }
      }

      this.emit('groupSelected', { id });
    }
  }

  /**
   * Calculate group bounds
   */
  private calculateGroupBounds(annotationIds: string[]): GroupBounds | null {
    const validAnnotations = annotationIds
      .map(id => this.annotations.get(id))
      .filter((a): a is Annotation => a !== undefined);

    if (validAnnotations.length === 0) return null;

    // Initialize bounds with first annotation
    const firstBounds = this.getAnnotationBounds(validAnnotations[0]);
    if (!firstBounds) return null;

    let minX = firstBounds.x;
    let minY = firstBounds.y;
    let maxX = firstBounds.x + firstBounds.width;
    let maxY = firstBounds.y + firstBounds.height;

    // Expand bounds to include all annotations
    for (let i = 1; i < validAnnotations.length; i++) {
      const bounds = this.getAnnotationBounds(validAnnotations[i]);
      if (bounds) {
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Get bounds of a single annotation
   */
  private getAnnotationBounds(annotation: Annotation): GroupBounds | null {
    const selector = annotation.target.selector;
    if (!selector || !selector.geometry) return null;

    switch (selector.geometry.type) {
      case 'rectangle':
        return {
          x: selector.geometry.x,
          y: selector.geometry.y,
          width: selector.geometry.width,
          height: selector.geometry.height
        };
      case 'polygon':
        const points = selector.geometry.points;
        if (!points || points.length === 0) return null;
        
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        return {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys)
        };
      // Add more shape types as needed
      default:
        return null;
    }
  }

  /**
   * Create SVG group element
   */
  private createGroupElement(id: string): void {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'annotorious-group');
    
    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    outline.setAttribute('class', 'annotorious-group-outline');
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke-dasharray', '5,5');
    outline.style.pointerEvents = 'none';
    
    group.appendChild(outline);
    this.svg.appendChild(group);
    this.groupElements.set(id, group);

    // Add event listeners
    group.addEventListener('mouseenter', () => {
      this.emit('groupMouseEnter', { id });
    });

    group.addEventListener('mouseleave', () => {
      this.emit('groupMouseLeave', { id });
    });

    group.addEventListener('click', (evt) => {
      evt.stopPropagation();
      this.selectGroup(id);
    });
  }

  /**
   * Update group visuals
   */
  private updateGroupVisuals(id: string): void {
    const group = this.groups.get(id);
    const element = this.groupElements.get(id);
    
    if (group && element) {
      const bounds = this.calculateGroupBounds(group.annotations);
      if (bounds) {
        const outline = element.querySelector('rect');
        if (outline) {
          outline.setAttribute('x', bounds.x.toString());
          outline.setAttribute('y', bounds.y.toString());
          outline.setAttribute('width', bounds.width.toString());
          outline.setAttribute('height', bounds.height.toString());
          if (group.color) {
            outline.setAttribute('stroke', group.color);
          }
        }
      }
    }
  }

  /**
   * Update all groups containing specific annotations
   */
  private updateAffectedGroups(annotationIds: string[]): void {
    const affectedGroups = new Set<string>();
    
    for (const group of this.groups.values()) {
      if (group.annotations.some(id => annotationIds.includes(id))) {
        affectedGroups.add(group.id);
      }
    }

    affectedGroups.forEach(id => this.updateGroupVisuals(id));
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.groupElements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    this.groups.clear();
    this.annotations.clear();
    this.groupElements.clear();
  }
}
