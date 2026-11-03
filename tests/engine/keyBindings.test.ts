import { DEFAULT_BINDINGS, actionOf, canBind, keyCap, keyOf, rebind } from '../../src/core/input/keyBindings';

describe('keys of a computer', () => {
  it('maps the default keys and the arrows to actions', () => {
    expect(actionOf(undefined, 'W')).toBe('up');
    expect(actionOf(undefined, 'ArrowLeft')).toBe('left');
    expect(actionOf(undefined, ' ')).toBe('shoot');
    expect(actionOf(undefined, 'x')).toBeNull();
  });

  it('rebinds a key, swapping with the action that had it, and keeps the arrows', () => {
    let b = rebind(undefined, 'up', 'i');
    expect(keyOf(b, 'up')).toBe('i');
    expect(actionOf(b, 'w')).toBeNull();
    expect(actionOf(b, 'ArrowUp')).toBe('up');
    // Giving Q (the ability) to shoot: the ability takes the space bar.
    b = rebind(b, 'shoot', 'Q');
    expect(keyOf(b, 'shoot')).toBe('q');
    expect(keyOf(b, 'ability')).toBe(' ');
    // Reserved keys are refused.
    expect(rebind(b, 'pause', 'Escape')).toEqual(b);
    expect(canBind('Enter')).toBe(false);
    expect(canBind('ArrowUp')).toBe(false);
    expect(canBind('F5')).toBe(false);
  });

  it('prints keys as keycaps', () => {
    expect(keyCap(' ', 'Space')).toBe('Space');
    expect(keyCap('q', 'Space')).toBe('Q');
    expect(keyCap('ArrowUp', 'Space')).toBe('↑');
    expect(Object.keys(DEFAULT_BINDINGS)).toHaveLength(12);
  });
});
