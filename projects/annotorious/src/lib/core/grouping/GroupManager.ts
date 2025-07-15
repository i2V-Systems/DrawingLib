import { Annotation } from '../../types/annotation.types';
import { AnnotationState } from '../state/AnnotationState';

export class GroupManager {
  private groupMap: Map<string, Set<string>> = new Map(); // groupId -> annotationIds
  private annotationToGroup: Map<string, string> = new Map(); // annotationId -> groupId
  private annotationState: AnnotationState;

  constructor(annotationState: AnnotationState) {
    this.annotationState = annotationState;
  }

  addToGroup(groupId: string, annotationId: string): void {
    if (!this.groupMap.has(groupId)) {
      this.groupMap.set(groupId, new Set());
    }
    this.groupMap.get(groupId)!.add(annotationId);
    this.annotationToGroup.set(annotationId, groupId);
  }

  removeFromGroup(groupId: string, annotationId: string): void {
    const group = this.groupMap.get(groupId);
    if (group) {
      group.delete(annotationId);
      if (group.size === 0) {
        this.groupMap.delete(groupId);
      }
    }
    this.annotationToGroup.delete(annotationId);
  }

  getGroup(groupId: string): Annotation[] {
    const ids = this.groupMap.get(groupId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.annotationState.getAnnotation(id)).filter(Boolean) as Annotation[];
  }

  getGroupIdForAnnotation(annotationId: string): string | undefined {
    return this.annotationToGroup.get(annotationId);
  }

  updateGroup(groupId: string, updateFn: (annotation: Annotation) => Annotation): void {
    const ids = this.groupMap.get(groupId);
    if (!ids) return;
    ids.forEach(id => {
      const annotation = this.annotationState.getAnnotation(id);
      if (annotation) {
        const updated = updateFn(annotation);
        this.annotationState.update(id, updated);
      }
    });
  }
} 