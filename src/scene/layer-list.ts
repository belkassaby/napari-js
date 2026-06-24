import { Emitter } from './events';
import type { Layer } from '../layers/layer';

/** Ordered, evented collection of layers. Index 0 is drawn first (bottom). */
export class LayerList implements Iterable<Layer> {
  private readonly _items: Layer[] = [];

  readonly added = new Emitter<Layer>();
  readonly removed = new Emitter<Layer>();
  /** Fires on any structural change (add/remove/move/clear). */
  readonly changed = new Emitter<LayerList>();

  get items(): readonly Layer[] {
    return this._items;
  }

  get length(): number {
    return this._items.length;
  }

  add(layer: Layer): Layer {
    this._items.push(layer);
    this.added.emit(layer);
    this.changed.emit(this);
    return layer;
  }

  remove(layer: Layer): boolean {
    const i = this._items.indexOf(layer);
    if (i < 0) return false;
    this._items.splice(i, 1);
    this.removed.emit(layer);
    this.changed.emit(this);
    return true;
  }

  clear(): void {
    const old = this._items.splice(0, this._items.length);
    for (const layer of old) this.removed.emit(layer);
    this.changed.emit(this);
  }

  [Symbol.iterator](): Iterator<Layer> {
    return this._items[Symbol.iterator]();
  }
}
