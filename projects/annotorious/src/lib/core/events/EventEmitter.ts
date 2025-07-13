type EventHandler<T = any> = (event: T) => void;

/**
 * Generic event emitter class
 */
export class EventEmitter<Events extends Record<string, any> = Record<string, any>> {
  private events: Map<keyof Events, Set<EventHandler<Events[keyof Events]>>>;

  constructor() {
    this.events = new Map();
  }

  /**
   * Add an event listener
   */
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler as EventHandler<Events[keyof Events]>);
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler<Events[keyof Events]>);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * Emit an event
   */
  emit<K extends keyof Events>(event: K, args: Events[K]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(args);
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
          // Re-throw critical errors
          if (error instanceof Error && error.message.includes('critical')) {
            throw error;
          }
        }
      });
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.events.clear();
  }

  /**
   * Get all registered event names
   */
  eventNames(): Array<keyof Events> {
    return Array.from(this.events.keys());
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount<K extends keyof Events>(event: K): number {
    return this.events.get(event)?.size || 0;
  }
}
