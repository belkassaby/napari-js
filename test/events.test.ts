import { describe, it, expect } from 'vitest';
import { Emitter } from '../src/scene/events';

describe('Emitter', () => {
  it('delivers emitted values to all listeners', () => {
    const e = new Emitter<number>();
    const seen: number[] = [];
    e.connect((v) => seen.push(v));
    e.connect((v) => seen.push(v * 10));
    e.emit(2);
    expect(seen).toEqual([2, 20]);
  });

  it('connect returns an unsubscribe that stops delivery', () => {
    const e = new Emitter<number>();
    let count = 0;
    const off = e.connect(() => count++);
    e.emit(1);
    off();
    e.emit(1);
    expect(count).toBe(1);
  });

  it('clear removes all listeners', () => {
    const e = new Emitter<void>();
    let count = 0;
    e.connect(() => count++);
    e.clear();
    e.emit();
    expect(count).toBe(0);
  });
});
