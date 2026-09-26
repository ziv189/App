import type { Settings } from '../core/Settings';
import type { UiInput } from '../ui/Ui';
import { applyResponseCurve, clampLength, radialDeadzone, type Vec2 } from './math';
import type { Action } from './bindings';

export type InputDevice = 'keyboardMouse' | 'gamepad';

/** Everything the game needs from the player's hands for one rendered frame. */
export interface InputFrame {
  /** Movement intent: x = right, y = forward; length <= 1 (analog sticks give partial values). */
  move: Vec2;
  /** Look change this frame in radians: x = turn right, y = look up. */
  look: Vec2;
  sprint: boolean;
  crouchPressed: boolean;
  interactPressed: boolean;
  pausePressed: boolean;
  debugPressed: boolean;
  /** A or Start on a controller; starts or resumes the game from menus without the mouse. */
  gamepadConfirmPressed: boolean;
  flashlightPressed: boolean;
  phonePressed: boolean;
  /** Navigation for the phone, notes and keypad. */
  ui: UiInput;
  device: InputDevice;
}

/** Base mouse look speed (radians per mouse count) at sensitivity 1.0. */
const MOUSE_RADIANS_PER_COUNT = 0.0022;
/** Controller look speed at full stick deflection and sensitivity 1.0 (radians per second). */
const PAD_YAW_SPEED = 2.6; // ~150 deg/s
const PAD_PITCH_SPEED = 1.8; // ~100 deg/s

/** Button indices of the W3C "standard" gamepad layout (Xbox names; PlayStation equivalents in brackets). */
const PAD = { A: 0, B: 1, X: 2, Y: 3, START: 9, L3: 10, UP: 12, DOWN: 13 } as const; // A [Cross], B [Circle], X [Square], Y [Triangle]

/** Keys whose browser default (scrolling, quick-find, etc.) we block while the game has focus. */
const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC', 'KeyE', 'KeyF', 'KeyQ', 'Tab', 'Enter', 'Backspace',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight', 'Backquote',
  'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
]);

const DIGIT = /^(?:Digit|Numpad)(\d)$/;

export class Input {
  /** Set by the game while playing, so movement keys don't scroll or trigger browser shortcuts. */
  /** While true, the game's keys don't do their browser default (Tab moving focus, Space scrolling...). */
  captureKeys = false;
  private boundCodes = new Set<string>();
  /** Called when the browser refuses to capture the mouse (e.g. clicking again too quickly after Esc). */
  onPointerLockFailed: (() => void) | null = null;
  /**
   * Fallback for pages that can't capture the mouse: look around by holding the left button and
   * dragging. Only used while the mouse isn't captured.
   */
  dragLook = false;

  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;
  private mouseClicked = false;
  private mouseRightClicked = false;
  private readonly typed: string[] = [];
  private ignoreMouseUntil = 0;
  private padPrev: boolean[] = [];
  private padIndex: number | null = null;
  private sprintLatched = false;
  private padNavHeld = false;
  private device: InputDevice = 'keyboardMouse';

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index === this.padIndex) this.padIndex = null;
    });
  }

  get pointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  /** Must be called from a click/key handler: browsers only allow mouse capture after a user gesture. */
  requestPointerLock(): void {
    const attempt = (options?: PointerLockOptions): Promise<void> => {
      try {
        // Older browsers return undefined instead of a promise.
        return (this.canvas.requestPointerLock(options) as Promise<void> | undefined) ?? Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    };
    // Raw (unaccelerated) mouse input where supported; plain capture everywhere else.
    attempt({ unadjustedMovement: true })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'NotSupportedError') return attempt();
        throw err;
      })
      .catch(() => this.onPointerLockFailed?.());
  }

  exitPointerLock(): void {
    if (this.pointerLocked) document.exitPointerLock();
  }

  /** Reads all devices. Call exactly once per rendered frame. */
  poll(dt: number, settings: Readonly<Settings>): InputFrame {
    const key = (code: string) => this.held.has(code);
    const hit = (code: string) => this.pressed.has(code);
    const invert = settings.invertY ? -1 : 1;

    const keys = settings.keys;
    this.boundCodes = new Set(Object.values(keys).flat());
    const down = (a: Action) => keys[a].some(key);
    const tapped = (a: Action) => keys[a].some(hit);
    let move = clampLength({
      x: Number(down('right')) - Number(down('left')),
      y: Number(down('forward')) - Number(down('back')),
    });
    const mouseScale = MOUSE_RADIANS_PER_COUNT * settings.mouseSensitivity;
    const look = { x: this.mouseDX * mouseScale, y: -this.mouseDY * mouseScale * invert };
    let sprint = down('run');
    let crouchPressed = tapped('crouch');
    let interactPressed = tapped('use') || this.mouseClicked;
    let pausePressed = hit('Escape');
    let gamepadConfirmPressed = false;
    let flashlightPressed = tapped('flashlight');
    let phonePressed = tapped('phone');
    const ui: UiInput = {
      up: hit('ArrowUp') || tapped('forward'),
      down: hit('ArrowDown') || tapped('back'),
      select: tapped('use') || hit('Enter') || hit('Space') || this.mouseClicked,
      back: hit('Backspace') || hit('KeyQ') || this.mouseRightClicked,
      close: hit('Escape') || tapped('phone'),
      digits: this.typed.join(''),
      erase: hit('Backspace'),
      mouseDX: this.mouseDX,
      mouseDY: this.mouseDY,
    };

    const pad = this.readGamepad();
    if (pad) {
      const down = (i: number) => pad.buttons[i]?.pressed ?? false;
      const edge = (i: number) => down(i) && !this.padPrev[i];
      const leftStick = radialDeadzone(pad.axes[0] ?? 0, -(pad.axes[1] ?? 0));
      const rightStick = applyResponseCurve(radialDeadzone(pad.axes[2] ?? 0, -(pad.axes[3] ?? 0)), 2);
      const leftMag = Math.hypot(leftStick.x, leftStick.y);

      if (leftMag > 0 || rightStick.x !== 0 || rightStick.y !== 0 || pad.buttons.some((b) => b.pressed)) {
        this.device = 'gamepad';
      }
      if (leftMag > Math.hypot(move.x, move.y)) move = leftStick;
      look.x += rightStick.x * PAD_YAW_SPEED * settings.gamepadSensitivity * dt;
      look.y += rightStick.y * PAD_PITCH_SPEED * settings.gamepadSensitivity * dt * invert;

      // Clicking L3 starts running until the stick returns to rest (usual console behaviour).
      if (edge(PAD.L3)) this.sprintLatched = !this.sprintLatched;
      if (leftMag < 0.2) this.sprintLatched = false;
      sprint ||= this.sprintLatched;

      crouchPressed ||= edge(PAD.B);
      interactPressed ||= edge(PAD.A);
      pausePressed ||= edge(PAD.START);
      gamepadConfirmPressed = edge(PAD.A) || edge(PAD.START);
      flashlightPressed ||= edge(PAD.X);
      phonePressed ||= edge(PAD.Y);
      ui.up ||= edge(PAD.UP) || (leftStick.y > 0.7 && !this.padNavHeld);
      ui.down ||= edge(PAD.DOWN) || (leftStick.y < -0.7 && !this.padNavHeld);
      this.padNavHeld = Math.abs(leftStick.y) > 0.5;
      ui.select ||= edge(PAD.A);
      ui.back ||= edge(PAD.B);
      ui.close ||= edge(PAD.Y) || edge(PAD.START);
      this.padPrev = pad.buttons.map((b) => b.pressed);
    } else {
      this.sprintLatched = false;
      this.padPrev = [];
    }

    const frame: InputFrame = {
      move,
      look,
      sprint,
      crouchPressed,
      interactPressed,
      pausePressed,
      // Physical key left of "1" on every layout (event.code ignores the keyboard language).
      debugPressed: hit('Backquote'),
      gamepadConfirmPressed,
      flashlightPressed,
      phonePressed,
      ui,
      device: this.device,
    };
    this.pressed.clear();
    this.typed.length = 0;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseClicked = false;
    this.mouseRightClicked = false;
    return frame;
  }

  private readGamepad(): Gamepad | null {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    if (this.padIndex !== null) {
      const current = pads[this.padIndex];
      if (current?.connected) return current;
    }
    // Prefer a controller the browser recognises as a standard layout.
    let fallback: Gamepad | null = null;
    for (const pad of pads) {
      if (!pad?.connected) continue;
      if (pad.mapping === 'standard') {
        this.padIndex = pad.index;
        return pad;
      }
      fallback ??= pad;
    }
    this.padIndex = fallback?.index ?? null;
    return fallback;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
    if (this.captureKeys && !typing && (GAME_KEYS.has(e.code) || this.boundCodes.has(e.code))) e.preventDefault();
    if (e.repeat) return;
    // digits are kept in order: a slow frame can span several key presses on the door keypad
    const digit = DIGIT.exec(e.code);
    if (digit) this.typed.push(digit[1]!);
    if (!this.held.has(e.code)) this.pressed.add(e.code);
    this.held.add(e.code);
    this.device = 'keyboardMouse';
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.held.delete(e.code);
  };

  /** Alt-tabbing away would otherwise leave keys "stuck" down. */
  private onBlur = () => {
    this.held.clear();
  };

  private onMouseMove = (e: MouseEvent) => {
    const dragging = this.dragLook && !this.pointerLocked && (e.buttons & 1) === 1 && e.target === this.canvas;
    if (!(this.pointerLocked || dragging) || performance.now() < this.ignoreMouseUntil) return;
    this.mouseDX += e.movementX;
    this.mouseDY += e.movementY;
    this.device = 'keyboardMouse';
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.pointerLocked) return;
    if (e.button === 0) this.mouseClicked = true;
    if (e.button === 2) this.mouseRightClicked = true;
  };

  private onPointerLockChange = () => {
    // Some browsers report one large bogus movement right after capture; skip it.
    if (this.pointerLocked) this.ignoreMouseUntil = performance.now() + 60;
    this.held.clear();
  };
}
