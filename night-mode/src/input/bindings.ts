/**
 * Keyboard bindings: which physical keys (KeyboardEvent.code) do what. Players can change them in
 * Settings; the choice is saved with the other settings.
 */

export type Action = 'forward' | 'back' | 'left' | 'right' | 'run' | 'use' | 'phone' | 'flashlight' | 'crouch';

export type KeyBindings = Record<Action, string[]>;

/** The actions in the order the Controls list shows them, with the controller button for each. */
export const ACTIONS: readonly { id: Action; label: string; pad: string }[] = [
  { id: 'forward', label: 'Walk forward', pad: 'Left stick' },
  { id: 'back', label: 'Walk back', pad: 'Left stick' },
  { id: 'left', label: 'Step left', pad: 'Left stick' },
  { id: 'right', label: 'Step right', pad: 'Left stick' },
  { id: 'run', label: 'Run (hold)', pad: 'Click L3' },
  { id: 'use', label: 'Use / read / open', pad: 'A' },
  { id: 'phone', label: 'Phone', pad: 'Y' },
  { id: 'flashlight', label: 'Flashlight', pad: 'X' },
  { id: 'crouch', label: 'Crouch / hide', pad: 'B' },
];

export const DEFAULT_KEYS: Readonly<KeyBindings> = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  use: ['KeyE'],
  // Tab isn't on every keyboard (and some browsers move focus with it), so P opens the phone too
  phone: ['Tab', 'KeyP'],
  flashlight: ['KeyF'],
  crouch: ['KeyC'],
};

/** Keys that keep their meaning: pause, the door keypad's digits, the debug overlay. */
export const RESERVED_KEYS = new Set([
  'Escape', 'Backquote',
  'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
  'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
]);

const NAMES: Record<string, string> = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  ShiftLeft: 'Shift', ShiftRight: 'Right Shift', ControlLeft: 'Ctrl', ControlRight: 'Right Ctrl',
  AltLeft: 'Alt', AltRight: 'Right Alt', MetaLeft: 'Meta', MetaRight: 'Right Meta',
  Space: 'Space', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace', CapsLock: 'Caps Lock',
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'",
  Comma: ',', Period: '.', Slash: '/', IntlBackslash: '\\',
};

/** A short, readable name for a key code: "KeyE" → "E", "ShiftLeft" → "Shift", "ArrowUp" → "↑". */
export function keyName(code: string): string {
  if (NAMES[code]) return NAMES[code]!;
  const m = /^(?:Key|Digit)(.)$/.exec(code);
  if (m) return m[1]!;
  const num = /^Numpad(.+)$/.exec(code);
  if (num) return `Num ${num[1]}`;
  return code;
}

/** The first key of an action for inline hints, e.g. "Press <kbd>P</kbd>". Several keys are joined with "or". */
export function keysHtml(bindings: Readonly<KeyBindings>, action: Action, max = 2): string {
  const keys = bindings[action].slice(0, max);
  return keys.length ? keys.map((k) => `<kbd>${keyName(k)}</kbd>`).join(' or ') : '<kbd>—</kbd>';
}

export function keysText(bindings: Readonly<KeyBindings>, action: Action, max = 2): string {
  const keys = bindings[action].slice(0, max);
  return keys.length ? keys.map(keyName).join(' or ') : '—';
}

/** Turns stored bindings (possibly old or hand-edited) into valid ones; missing actions get the defaults. */
export function sanitizeKeys(raw: unknown): KeyBindings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = {} as KeyBindings;
  for (const { id } of ACTIONS) {
    const list = r[id];
    const valid = Array.isArray(list)
      ? [...new Set(list.filter((k): k is string => typeof k === 'string' && /^[A-Za-z0-9]{2,24}$/.test(k) && !RESERVED_KEYS.has(k)))].slice(0, 3)
      : null;
    out[id] = valid ?? [...DEFAULT_KEYS[id]];
  }
  return out;
}

/**
 * Binds `code` to `action` as its only key. If another action used that key, it loses it (and gets its
 * default back if that default is free), so one key never does two things.
 */
export function rebind(bindings: Readonly<KeyBindings>, action: Action, code: string): KeyBindings {
  const next = {} as KeyBindings;
  for (const { id } of ACTIONS) next[id] = bindings[id].filter((k) => k !== code);
  next[action] = [code];
  const used = new Set(Object.values(next).flat());
  for (const { id } of ACTIONS) {
    if (next[id].length) continue;
    const free = DEFAULT_KEYS[id].filter((k) => !used.has(k));
    next[id] = free.slice(0, 1);
    for (const k of next[id]) used.add(k);
  }
  return next;
}
