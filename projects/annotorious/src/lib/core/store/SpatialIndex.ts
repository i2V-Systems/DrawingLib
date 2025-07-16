import RBush from 'rbush';

export interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: string;
}

export class SpatialIndex {
  private tree: RBush<SpatialItem>;

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

  search(point: { x: number; y: number }): SpatialItem[] {
    // RBush search expects a bounding box, so we use a zero-area box at the point
    return this.tree.search({
      minX: point.x,
      minY: point.y,
      maxX: point.x,
      maxY: point.y
    });
  }

  clear() {
    this.tree.clear();
  }
}
