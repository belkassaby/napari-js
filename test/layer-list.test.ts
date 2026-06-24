import { describe, it, expect } from 'vitest';
import { LayerList } from '../src/scene/layer-list';
import { PointsLayer } from '../src/layers/points-layer';

const mk = (name: string): PointsLayer => new PointsLayer([[0, 0]], { name });

describe('LayerList', () => {
  it('adds layers, tracks length and order, and is iterable', () => {
    const list = new LayerList();
    const a = list.add(mk('a'));
    const b = list.add(mk('b'));
    expect(list.length).toBe(2);
    expect([...list]).toEqual([a, b]);
    expect(list.items[0]).toBe(a);
  });

  it('fires added/removed/changed events', () => {
    const list = new LayerList();
    let added = 0;
    let removed = 0;
    let changed = 0;
    list.added.connect(() => added++);
    list.removed.connect(() => removed++);
    list.changed.connect(() => changed++);
    const a = list.add(mk('a'));
    list.remove(a);
    expect(added).toBe(1);
    expect(removed).toBe(1);
    expect(changed).toBe(2); // add + remove
  });

  it('remove returns false for a layer not in the list', () => {
    const list = new LayerList();
    expect(list.remove(mk('ghost'))).toBe(false);
  });

  it('clear empties the list and emits removed for each', () => {
    const list = new LayerList();
    list.add(mk('a'));
    list.add(mk('b'));
    let removed = 0;
    list.removed.connect(() => removed++);
    list.clear();
    expect(list.length).toBe(0);
    expect(removed).toBe(2);
  });
});
