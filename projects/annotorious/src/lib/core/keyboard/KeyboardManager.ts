import { EventEmitter } from '../events/EventEmitter';

export interface KeyBinding {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
}

type KeyboardEventType = globalThis.KeyboardEvent;

/**
 * Manages keyboard shortcuts and bindings
 */
export class KeyboardManager extends EventEmitter {
  private bindings: KeyBinding[];
  private enabled: boolean;
  private boundHandleKeyDown: (evt: KeyboardEventType) => void;

  constructor() {
    super();
    
    this.bindings = [];
    this.enabled = true;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);

    // Attach event listener
    document.addEventListener('keydown', this.boundHandleKeyDown);
  }

  /**
   * Enable/disable keyboard shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Add a keyboard binding
   */
  addBinding(binding: KeyBinding): void {
    this.bindings.push(binding);
  }

  /**
   * Remove a keyboard binding
   */
  removeBinding(binding: KeyBinding): void {
    const index = this.bindings.indexOf(binding);
    if (index > -1) {
      this.bindings.splice(index, 1);
    }
  }

  /**
   * Clear all bindings
   */
  clearBindings(): void {
    this.bindings = [];
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(evt: KeyboardEventType): void {
    if (!this.enabled) return;

    // Find matching binding
    const binding = this.bindings.find(b => 
      b.key.toLowerCase() === evt.key.toLowerCase() &&
      !!b.ctrl === evt.ctrlKey &&
      !!b.alt === evt.altKey &&
      !!b.shift === evt.shiftKey
    );

    if (binding) {
      evt.preventDefault();
      binding.action();
      this.emit('shortcut', { binding });
    }
  }

  /**
   * Clean up
   */
  destroy(): void {
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    this.clearBindings();
  }
}

/**
 * Default keyboard shortcuts
 */
export const defaultKeyBindings: KeyBinding[] = [
  {
    key: 'Delete',
    action: () => {
      // Delete selected annotation
    }
  },
  {
    key: 'z',
    ctrl: true,
    action: () => {
      // Undo
    }
  },
  {
    key: 'y',
    ctrl: true,
    action: () => {
      // Redo
    }
  },
  {
    key: 'Escape',
    action: () => {
      // Cancel current operation
    }
  }
];
