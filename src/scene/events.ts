export type Listener<T> = (value: T) => void;

/** Minimal typed event emitter (the napari `EventEmitter` / psygnal analog). */
export class Emitter<T> {
  private readonly listeners = new Set<Listener<T>>();

  /** Subscribe; returns an unsubscribe function. */
  connect(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(value: T): void {
    for (const listener of this.listeners) {
      listener(value);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
