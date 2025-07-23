import RBush from 'rbush';
import type RBushType from 'rbush';

export interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: string;
}

export class SpatialIndex {
  private tree: InstanceType<typeof RBush>;

  constructor() {
    this.tree = new RBush();
  }

  insert(item: SpatialItem) {
    this.tree.insert(item);
  }

  remove(item: SpatialItem) {
    this.tree.remove(item, (a: any, b: any) => a.id === b.id);
  }

  update(oldItem: SpatialItem, newItem: SpatialItem) {
    this.remove(oldItem);
    this.insert(newItem);
  }

  search(query: { x: number; y: number } | { minX: number; minY: number; maxX: number; maxY: number }): SpatialItem[] {
    if ('x' in query && 'y' in query) {
      // Convert point to zero-area bounding box
      return this.tree.search({
        minX: query.x,
        minY: query.y,
        maxX: query.x,
        maxY: query.y
      }) as SpatialItem[];
    } else {
      // Use bounding box directly
      return this.tree.search(query) as SpatialItem[];
    }
  }

  clear() {
    this.tree.clear();
  }
}
