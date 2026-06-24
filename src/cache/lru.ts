/**
 * Bounded least-recently-used cache. Insertion/`get` mark an entry most-recently-used; when
 * size exceeds `capacity` the oldest entries are evicted via `onEvict` (used to destroy GPU
 * textures). Relies on `Map` preserving insertion order.
 */
export class LruCache<V> {
  private readonly map = new Map<string, V>();

  constructor(
    private readonly capacity: number,
    private readonly onEvict?: (value: V, key: string) => void,
  ) {
    if (capacity < 1) throw new Error('LruCache capacity must be >= 1.');
  }

  get size(): number {
    return this.map.size;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  /** Get a value and mark it most-recently-used. */
  get(key: string): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  /** Insert/update a value (most-recently-used), evicting the oldest beyond capacity. */
  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      const evicted = this.map.get(oldest)!;
      this.map.delete(oldest);
      this.onEvict?.(evicted, oldest);
    }
  }

  delete(key: string): boolean {
    const value = this.map.get(key);
    if (value === undefined) return false;
    this.map.delete(key);
    this.onEvict?.(value, key);
    return true;
  }

  clear(): void {
    for (const [key, value] of this.map) this.onEvict?.(value, key);
    this.map.clear();
  }
}
