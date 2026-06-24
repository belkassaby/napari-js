import { describe, it, expect } from 'vitest';
import { LruCache } from '../src/cache/lru';

describe('LruCache', () => {
  it('evicts the least-recently-used entry past capacity', () => {
    const evicted: string[] = [];
    const c = new LruCache<number>(2, (_v, k) => evicted.push(k));
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3); // evicts 'a'
    expect(evicted).toEqual(['a']);
    expect(c.has('a')).toBe(false);
    expect(c.size).toBe(2);
  });

  it('get marks an entry most-recently-used', () => {
    const evicted: string[] = [];
    const c = new LruCache<number>(2, (_v, k) => evicted.push(k));
    c.set('a', 1);
    c.set('b', 2);
    c.get('a'); // 'a' now MRU → 'b' is oldest
    c.set('c', 3);
    expect(evicted).toEqual(['b']);
    expect(c.has('a')).toBe(true);
  });

  it('delete fires onEvict once and reports presence', () => {
    const evicted: string[] = [];
    const c = new LruCache<number>(4, (_v, k) => evicted.push(k));
    c.set('x', 9);
    expect(c.delete('x')).toBe(true);
    expect(c.delete('x')).toBe(false);
    expect(evicted).toEqual(['x']);
  });

  it('clear evicts everything', () => {
    const evicted: string[] = [];
    const c = new LruCache<number>(4, (_v, k) => evicted.push(k));
    c.set('a', 1);
    c.set('b', 2);
    c.clear();
    expect(evicted.sort()).toEqual(['a', 'b']);
    expect(c.size).toBe(0);
  });

  it('rejects a capacity below 1', () => {
    expect(() => new LruCache<number>(0)).toThrow();
  });
});
