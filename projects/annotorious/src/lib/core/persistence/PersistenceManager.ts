import { EventEmitter } from '../events/EventEmitter';
import { Annotation } from '../annotation/types';

export interface StorageAdapter {
  load(imageUrl: string): Promise<Annotation[]>;
  save(imageUrl: string, annotations: Annotation[]): Promise<void>;
  delete(imageUrl: string): Promise<void>;
}

export interface PersistenceOptions {
  autoSave?: boolean;
  adapter?: StorageAdapter;
}

/**
 * Local storage adapter implementation
 */
export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix: string = 'annotorious') {
    this.prefix = prefix;
  }

  async load(imageUrl: string): Promise<Annotation[]> {
    const key = this.getStorageKey(imageUrl);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  async save(imageUrl: string, annotations: Annotation[]): Promise<void> {
    const key = this.getStorageKey(imageUrl);
    localStorage.setItem(key, JSON.stringify(annotations));
  }

  async delete(imageUrl: string): Promise<void> {
    const key = this.getStorageKey(imageUrl);
    localStorage.removeItem(key);
  }

  private getStorageKey(imageUrl: string): string {
    return `${this.prefix}-${imageUrl}`;
  }
}

/**
 * Manages annotation persistence
 */
interface PersistenceEvents {
  'load': { annotations: Annotation[] };
  'save': { annotations: Annotation[] };
  'delete': { imageUrl: string };
  'error': { error: Error; operation: string };
}

export class PersistenceManager extends EventEmitter<PersistenceEvents> {
  private imageUrl: string;
  private adapter: StorageAdapter;
  private autoSave: boolean;
  private dirty: boolean;
  private saveTimeout: NodeJS.Timeout | null;

  constructor(imageUrl: string, options: PersistenceOptions = {}) {
    super();
    
    this.imageUrl = imageUrl;
    this.adapter = options.adapter || new LocalStorageAdapter();
    this.autoSave = options.autoSave || true;
    this.dirty = false;
    this.saveTimeout = null;
  }

  /**
   * Load annotations
   */
  async load(): Promise<Annotation[]> {
    try {
      const annotations = await this.adapter.load(this.imageUrl);
      this.emit('load', { annotations });
      return annotations;
    } catch (error) {
      this.emit('error', { error, operation: 'load' });
      return [];
    }
  }

  /**
   * Save annotations
   */
  async save(annotations: Annotation[]): Promise<void> {
    try {
      await this.adapter.save(this.imageUrl, annotations);
      this.dirty = false;
      this.emit('save', { annotations });
    } catch (error) {
      this.emit('error', { error, operation: 'save' });
    }
  }

  /**
   * Delete all annotations
   */
  async delete(): Promise<void> {
    try {
      await this.adapter.delete(this.imageUrl);
      this.emit('delete', { imageUrl: this.imageUrl });
    } catch (error) {
      this.emit('error', { error, operation: 'delete' });
    }
  }

  /**
   * Mark as dirty and schedule save if auto-save is enabled
   */
  markDirty(annotations: Annotation[]): void {
    this.dirty = true;

    if (this.autoSave) {
      // Debounce save operation
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }

      this.saveTimeout = setTimeout(() => {
        if (this.dirty) {
          this.save(annotations);
        }
      }, 1000);
    }
  }

  /**
   * Check if there are unsaved changes
   */
  isDirty(): boolean {
    return this.dirty;
  }

  /**
   * Set auto-save option
   */
  setAutoSave(autoSave: boolean): void {
    this.autoSave = autoSave;
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  }
}

/**
 * IndexedDB storage adapter implementation
 */
export class IndexedDBAdapter implements StorageAdapter {
  private dbName: string;
  private storeName: string;

  constructor(dbName: string = 'annotorious', storeName: string = 'annotations') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async load(imageUrl: string): Promise<Annotation[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(imageUrl);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  async save(imageUrl: string, annotations: Annotation[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(annotations, imageUrl);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => resolve();
    });
  }

  async delete(imageUrl: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(imageUrl);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => resolve();
    });
  }
}
