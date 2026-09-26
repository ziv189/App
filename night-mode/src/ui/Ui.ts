import type { Settings, SettingsStore } from '../core/Settings';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing from index.html`);
  return el as T;
};

export type ScreenName = 'none' | 'loading' | 'title' | 'pause' | 'ending' | 'credits' | 'error';

export interface PhoneMessage {
  from: 'them' | 'me' | 'system';
  text: string;
  /** Shown above the message when it differs from the previous one ("8:02 PM"). */
  stamp?: string;
}

export interface PhoneThread {
  id: string;
  name: string;
  icon: { letter: string; color: string };
  messages: PhoneMessage[];
  unread: number;
}

export interface PhoneApp {
  kind: 'thread' | 'page';
  id: string;
  name: string;
  preview: string;
  icon: { letter: string; color: string };
  badge?: number;
  /** For pages: HTML content. */
  html?: string;
}

export interface PhoneProfile {
  owner: string;
  time: string;
  battery: string;
  apps: () => PhoneApp[];
  thread: (id: string) => PhoneThread | undefined;
  onOpen?: (id: string) => void;
}

/** Keys and pointer input the modal UIs (phone, notes, keypad) react to this frame. */
export interface UiInput {
  up: boolean;
  down: boolean;
  select: boolean;
  back: boolean;
  close: boolean;
  /** Digit keys pressed since the last frame, in order. */
  digits: string;
  erase: boolean;
  mouseDY: number;
  mouseDX: number;
}

type Modal = 'phone' | 'reader' | 'keypad' | null;

/**
 * Everything drawn in HTML over the 3D view: menus, HUD (prompts, objective, subtitles), fades and
 * title cards, the phone, notes and the door keypad.
 */
export class Ui {
  onNewGame: (() => void) | null = null;
  onContinue: (() => void) | null = null;
  onChapter: ((id: string) => void) | null = null;
  onResume: (() => void) | null = null;
  onQuit: (() => void) | null = null;
  onEndingDone: (() => void) | null = null;
  onUiSound: ((name: string) => void) | null = null;

  modal: Modal = null;
  private screen: ScreenName = 'loading';
  private readonly hud = $('hud');
  private readonly prompt = $('prompt');
  private readonly promptText = $('prompt-text');
  private readonly promptKey = $('prompt-key');
  private readonly reticle = $('reticle');
  private readonly objective = $('objective');
  private readonly objectiveText = $('objective-text');
  private readonly subtitles = $('subtitles');
  private readonly toast = $('toast');
  private readonly fader = $('fader');
  private readonly card = $('card');
  private readonly frost = $('frost');
  private readonly glitchEl = $('glitch');
  private readonly form = $<HTMLFormElement>('settings-form');
  private toastTimer = 0;
  private subtitleTimer = 0;
  private subtitlesEnabled = true;
  private fadeAnim: Animation | null = null;

  // phone state
  private phoneProfile: PhoneProfile | null = null;
  private phoneView: { kind: 'home' } | { kind: 'app'; id: string } = { kind: 'home' };
  private phoneFocus = 0;
  private phoneAccum = 0;
  private readonly phoneContent = $('phone-content');
  onFlashlightButton: (() => void) | null = null;
  private phoneResolve: (() => void) | null = null;

  // reader & keypad
  private readerResolve: (() => void) | null = null;
  private keypadResolve: ((code: string | null) => void) | null = null;
  private keypadValue = '';
  private keypadLength = 4;
  private keypadFocus = 0;
  private keypadAccum = { x: 0, y: 0 };
  keypadCheck: ((code: string) => boolean) | null = null;

  constructor(private readonly settings: SettingsStore) {
    $('btn-new').addEventListener('click', () => this.onNewGame?.());
    $('btn-continue').addEventListener('click', () => this.onContinue?.());
    $('btn-chapters').addEventListener('click', () => {
      const list = $('chapter-list');
      list.hidden = !list.hidden;
    });
    $('btn-settings').addEventListener('click', () => {
      this.show('pause');
      $('btn-resume').textContent = 'Back';
      this.pauseFromTitle = true;
    });
    $('btn-credits').addEventListener('click', () => this.showCredits());
    $('btn-resume').addEventListener('click', () => {
      if (this.pauseFromTitle) {
        this.pauseFromTitle = false;
        $('btn-resume').textContent = 'Resume';
        this.show('title');
      } else {
        this.onResume?.();
      }
    });
    $('btn-quit').addEventListener('click', () => this.onQuit?.());
    $('btn-ending-credits').addEventListener('click', () => this.showCredits());
    $('btn-ending-title').addEventListener('click', () => this.onEndingDone?.());
    $('btn-credits-close').addEventListener('click', () => {
      if (this.creditsFromEnding) this.onEndingDone?.();
      else this.show('title');
    });
    $('phone-close').addEventListener('click', () => this.closePhone());
    $('phone-light').addEventListener('click', () => this.onFlashlightButton?.());
    $('phone-back').addEventListener('click', () => this.phoneBack());
    $('reader').addEventListener('click', () => this.closeReader());
    this.form.addEventListener('input', () => this.readForm());
    this.form.addEventListener('submit', (e) => e.preventDefault());
    settings.onChange((s) => this.writeForm(s));
    this.writeForm(settings.get());
    this.buildKeypad();
    for (const b of document.querySelectorAll<HTMLButtonElement>('.menu-item, button.primary, button.secondary')) {
      b.addEventListener('mouseenter', () => this.onUiSound?.('ui_click'));
    }
  }

  private pauseFromTitle = false;
  private creditsFromEnding = false;

  // ------------------------------------------------------------------------------------ screens

  show(screen: ScreenName): void {
    this.screen = screen;
    for (const name of ['loading', 'title', 'pause', 'ending', 'credits', 'error'] as const) {
      $(`screen-${name}`).hidden = name !== screen;
    }
    this.hud.hidden = screen !== 'none';
  }

  get currentScreen(): ScreenName {
    return this.screen;
  }

  setProgress(fraction: number, status: string): void {
    $('progress-bar').style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
    $('loading-status').textContent = status;
  }

  setLoadingHint(text: string): void {
    $('loading-hint').textContent = text;
  }

  setTitleOptions(opts: { canContinue: boolean; chapters: { id: string; title: string; unlocked: boolean }[]; endings: string }): void {
    $('btn-continue').hidden = !opts.canContinue;
    const anyUnlocked = opts.chapters.some((c) => c.unlocked);
    $('btn-chapters').hidden = !anyUnlocked;
    const list = $('chapter-list');
    list.replaceChildren(
      ...opts.chapters.map((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = c.title;
        b.disabled = !c.unlocked;
        b.addEventListener('click', () => this.onChapter?.(c.id));
        return b;
      }),
    );
    $('endings-found').textContent = opts.endings;
  }

  setTitleHint(text: string): void {
    $('title-hint').textContent = text;
  }

  showLockHint(text: string): void {
    $('resume-hint').textContent = text;
  }

  showError(message: string): void {
    $('error-text').textContent = message;
    this.show('error');
  }

  showEnding(kicker: string, title: string, paragraphs: string[]): void {
    $('ending-kicker').textContent = kicker;
    $('ending-title').textContent = title;
    const text = $('ending-text');
    text.replaceChildren(
      ...paragraphs.map((p, i) => {
        const el = document.createElement('p');
        el.textContent = p;
        el.style.animationDelay = `${1.2 + i * 2.2}s`;
        return el;
      }),
    );
    this.creditsFromEnding = true;
    this.show('ending');
  }

  showCredits(html?: string): void {
    const roll = $('credits-roll');
    if (html) roll.innerHTML = html;
    // restart the scroll animation
    roll.style.animation = 'none';
    void roll.offsetHeight;
    roll.style.animation = '';
    this.show('credits');
  }

  setCredits(html: string): void {
    $('credits-roll').innerHTML = html;
  }

  // ---------------------------------------------------------------------------------------- HUD

  setPrompt(text: string | null, opts: { key?: string; locked?: boolean } = {}): void {
    if (!text) {
      this.prompt.hidden = true;
      this.reticle.classList.remove('active');
      return;
    }
    this.prompt.hidden = false;
    this.promptText.textContent = text;
    this.promptKey.textContent = opts.key ?? 'E';
    this.prompt.classList.toggle('locked', Boolean(opts.locked));
    this.reticle.classList.add('active');
  }

  setObjective(text: string | null): void {
    if (!text) {
      this.objective.hidden = true;
      return;
    }
    const changed = this.objectiveText.textContent !== text;
    this.objectiveText.textContent = text;
    this.objective.hidden = false;
    if (changed) {
      this.objective.classList.remove('fresh');
      void this.objective.offsetWidth;
      this.objective.classList.add('fresh');
    }
  }

  showSubtitle(label: string, color: string, text: string, seconds = 0): void {
    if (!this.subtitlesEnabled) return;
    const line = document.createElement('div');
    line.className = 'line';
    const who = document.createElement('span');
    who.className = 'speaker';
    who.style.color = color;
    who.textContent = label;
    line.append(who, document.createTextNode(text));
    this.subtitles.replaceChildren(line);
    window.clearTimeout(this.subtitleTimer);
    if (seconds > 0) this.subtitleTimer = window.setTimeout(() => this.clearSubtitle(), seconds * 1000);
  }

  clearSubtitle(): void {
    this.subtitles.replaceChildren();
  }

  showToast(text: string, seconds = 3.5): void {
    this.toast.textContent = text;
    this.toast.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toast.hidden = true), seconds * 1000);
  }

  setHudHint(text: string): void {
    $('hud-hint').textContent = text;
  }

  setKeyHint(html: string | null): void {
    const el = $('hint-keys');
    el.hidden = !html;
    if (html) el.innerHTML = html;
  }

  // ------------------------------------------------------------------------------- screen effects

  /** Fades the screen to black (1) or back (0) over `seconds`. */
  fade(to: number, seconds: number): Promise<void> {
    const from = Number(getComputedStyle(this.fader).opacity) || 0;
    this.fadeAnim?.cancel();
    const anim = this.fader.animate([{ opacity: from }, { opacity: to }], {
      duration: Math.max(1, seconds * 1000),
      fill: 'forwards',
      easing: 'ease-in-out',
    });
    this.fadeAnim = anim;
    return anim.finished.then(
      () => undefined,
      () => undefined,
    );
  }

  setBlack(on: boolean): void {
    this.fadeAnim?.cancel();
    this.fadeAnim = this.fader.animate([{ opacity: on ? 1 : 0 }], { duration: 1, fill: 'forwards' });
  }

  /** Title card on black: kicker (small), title, subtitle. */
  async titleCard(kicker: string, title: string, sub: string, seconds: number): Promise<void> {
    $('card-kicker').textContent = kicker;
    $('card-title').textContent = title;
    $('card-sub').textContent = sub;
    this.card.classList.add('shown');
    await new Promise((r) => setTimeout(r, seconds * 1000));
    this.card.classList.remove('shown');
    await new Promise((r) => setTimeout(r, 1200));
  }

  setFrost(amount: number): void {
    this.frost.style.opacity = String(Math.max(0, Math.min(1, amount)));
  }

  glitch(seconds: number): void {
    this.glitchEl.classList.add('on');
    window.setTimeout(() => this.glitchEl.classList.remove('on'), seconds * 1000);
  }

  // -------------------------------------------------------------------------------------- phone

  get phoneOpen(): boolean {
    return this.modal === 'phone';
  }

  openPhone(profile: PhoneProfile, openApp?: string): Promise<void> {
    this.phoneProfile = profile;
    this.modal = 'phone';
    $('phone').hidden = false;
    this.phoneView = openApp ? { kind: 'app', id: openApp } : { kind: 'home' };
    if (openApp) profile.onOpen?.(openApp);
    this.phoneFocus = 0;
    this.renderPhone();
    this.onUiSound?.('ui_click');
    return new Promise((r) => (this.phoneResolve = r));
  }

  closePhone(): void {
    if (this.modal !== 'phone') return;
    this.modal = null;
    $('phone').hidden = true;
    this.phoneResolve?.();
    this.phoneResolve = null;
  }

  refreshPhone(): void {
    if (this.modal === 'phone') this.renderPhone();
  }

  setFlashlightButton(on: boolean): void {
    $('phone-light').classList.toggle('on', on);
  }

  private phoneBack(): void {
    if (this.phoneView.kind === 'home') this.closePhone();
    else {
      this.phoneView = { kind: 'home' };
      this.renderPhone();
    }
  }

  private renderPhone(): void {
    const p = this.phoneProfile;
    if (!p) return;
    $('phone-time').textContent = p.time;
    $('phone-battery').textContent = p.battery;
    const content = this.phoneContent;
    const back = $('phone-back');
    if (this.phoneView.kind === 'home') {
      back.hidden = true;
      $('phone-title').textContent = p.owner;
      const apps = p.apps();
      this.phoneFocus = Math.min(this.phoneFocus, apps.length - 1);
      content.replaceChildren(
        ...apps.map((app, i) => {
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'app-row';
          if (i === this.phoneFocus) row.style.background = 'rgba(255,255,255,0.07)';
          const icon = document.createElement('div');
          icon.className = 'app-icon';
          icon.style.background = app.icon.color;
          icon.textContent = app.icon.letter;
          const meta = document.createElement('div');
          meta.className = 'meta';
          meta.innerHTML = `<div class="name"></div><div class="preview"></div>`;
          (meta.firstChild as HTMLElement).textContent = app.name;
          (meta.lastChild as HTMLElement).textContent = app.preview;
          row.append(icon, meta);
          if (app.badge) {
            const b = document.createElement('div');
            b.className = 'badge';
            b.textContent = String(app.badge);
            row.append(b);
          }
          row.addEventListener('click', () => this.openPhoneApp(app.id));
          return row;
        }),
      );
      return;
    }
    back.hidden = false;
    const id = this.phoneView.id;
    const app = p.apps().find((a) => a.id === id);
    $('phone-title').textContent = app?.name ?? '';
    if (app?.kind === 'page') {
      content.innerHTML = app.html ?? '';
      return;
    }
    const thread = p.thread(id);
    const box = document.createElement('div');
    box.className = 'thread';
    let lastStamp = '';
    for (const m of thread?.messages ?? []) {
      if (m.stamp && m.stamp !== lastStamp) {
        const s = document.createElement('div');
        s.className = 'stamp';
        s.textContent = m.stamp;
        box.append(s);
        lastStamp = m.stamp;
      }
      const b = document.createElement('div');
      b.className = `bubble ${m.from}`;
      b.textContent = m.text;
      box.append(b);
    }
    content.replaceChildren(box);
    content.scrollTop = content.scrollHeight;
  }

  private openPhoneApp(id: string): void {
    this.phoneView = { kind: 'app', id };
    this.phoneProfile?.onOpen?.(id);
    this.onUiSound?.('ui_click');
    this.renderPhone();
  }

  // ------------------------------------------------------------------------------------- reader

  /** Shows a note, letter or drawing. Resolves when the player puts it down. */
  read(html: string, style: 'serif' | 'hand' | 'typed' | 'drawing' = 'serif'): Promise<void> {
    const paper = $('reader-paper');
    paper.className = `paper ${style === 'serif' ? '' : style}`;
    $('reader-body').innerHTML = html;
    $('reader').hidden = false;
    this.modal = 'reader';
    this.onUiSound?.('paper');
    return new Promise((r) => (this.readerResolve = r));
  }

  closeReader(): void {
    if (this.modal !== 'reader') return;
    $('reader').hidden = true;
    this.modal = null;
    this.readerResolve?.();
    this.readerResolve = null;
  }

  // ------------------------------------------------------------------------------------- keypad

  private buildKeypad(): void {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
    $('keypad-grid').replaceChildren(
      ...keys.map((k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = k;
        b.addEventListener('click', () => this.keypadPress(k));
        return b;
      }),
    );
  }

  /** Opens the door keypad. Resolves with the accepted code, or null if the player stepped back. */
  keypad(length: number, check: (code: string) => boolean): Promise<string | null> {
    this.keypadLength = length;
    this.keypadCheck = check;
    this.keypadValue = '';
    this.keypadFocus = 4;
    this.renderKeypad();
    $('keypad').hidden = false;
    this.modal = 'keypad';
    return new Promise((r) => (this.keypadResolve = r));
  }

  private closeKeypad(result: string | null): void {
    if (this.modal !== 'keypad') return;
    $('keypad').hidden = true;
    this.modal = null;
    this.keypadResolve?.(result);
    this.keypadResolve = null;
  }

  private keypadPress(k: string): void {
    const display = $('keypad-display');
    display.classList.remove('error');
    if (k === '⌫') {
      this.keypadValue = this.keypadValue.slice(0, -1);
      this.onUiSound?.('keypad');
    } else if (k === '✓') {
      this.submitKeypad();
      return;
    } else if (this.keypadValue.length < this.keypadLength) {
      this.keypadValue += k;
      this.onUiSound?.('keypad');
      if (this.keypadValue.length === this.keypadLength) window.setTimeout(() => this.submitKeypad(), 250);
    }
    this.renderKeypad();
  }

  private submitKeypad(): void {
    const code = this.keypadValue;
    if (code.length < this.keypadLength) return;
    if (this.keypadCheck?.(code)) {
      this.onUiSound?.('keypad_ok');
      window.setTimeout(() => this.closeKeypad(code), 350);
    } else {
      this.onUiSound?.('keypad_error');
      $('keypad-display').classList.add('error');
      this.keypadValue = '';
      window.setTimeout(() => this.renderKeypad(), 500);
    }
  }

  private renderKeypad(): void {
    $('keypad-display').textContent = this.keypadValue.padEnd(this.keypadLength, '_');
    $('keypad-grid')
      .querySelectorAll('button')
      .forEach((b, i) => (b.style.outline = i === this.keypadFocus ? '2px solid rgba(160,190,255,0.8)' : ''));
  }

  // ------------------------------------------------------------------------ modal input handling

  /** Drives whichever modal is open with keyboard/controller/captured-mouse input. */
  handleInput(input: UiInput): void {
    if (this.modal === 'reader') {
      if (input.select || input.close || input.back) this.closeReader();
      return;
    }
    if (this.modal === 'keypad') {
      for (const d of input.digits) this.keypadPress(d);
      if (input.erase) this.keypadPress('⌫');
      else if (input.close || input.back) this.closeKeypad(null);
      this.keypadAccum.x += input.mouseDX;
      this.keypadAccum.y += input.mouseDY;
      let moved = false;
      if (Math.abs(this.keypadAccum.x) > 60) {
        this.keypadFocus = Math.max(0, Math.min(11, this.keypadFocus + Math.sign(this.keypadAccum.x)));
        this.keypadAccum.x = 0;
        moved = true;
      }
      if (Math.abs(this.keypadAccum.y) > 60 || input.up || input.down) {
        const dir = input.up ? -1 : input.down ? 1 : Math.sign(this.keypadAccum.y);
        this.keypadFocus = Math.max(0, Math.min(11, this.keypadFocus + 3 * dir));
        this.keypadAccum.y = 0;
        moved = true;
      }
      if (moved) this.renderKeypad();
      if (input.select && !input.digits) {
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
        this.keypadPress(keys[this.keypadFocus]!);
      }
      return;
    }
    if (this.modal === 'phone') {
      if (input.close) {
        this.closePhone();
        return;
      }
      if (input.back) {
        this.phoneBack();
        return;
      }
      if (this.phoneView.kind === 'home') {
        const apps = this.phoneProfile?.apps() ?? [];
        this.phoneAccum += input.mouseDY;
        let delta = input.down ? 1 : input.up ? -1 : 0;
        if (Math.abs(this.phoneAccum) > 45) {
          delta = Math.sign(this.phoneAccum);
          this.phoneAccum = 0;
        }
        if (delta) {
          this.phoneFocus = Math.max(0, Math.min(apps.length - 1, this.phoneFocus + delta));
          this.renderPhone();
        }
        if (input.select && apps[this.phoneFocus]) this.openPhoneApp(apps[this.phoneFocus]!.id);
      } else {
        const scroll = (input.down ? 60 : input.up ? -60 : 0) + input.mouseDY;
        if (scroll) this.phoneContent.scrollTop += scroll;
        if (input.select) this.phoneBack();
      }
    }
  }

  // ----------------------------------------------------------------------------------- settings

  private readForm(): void {
    const f = this.form.elements as HTMLFormControlsCollection & Record<string, HTMLInputElement | HTMLSelectElement>;
    const n = (name: string) => Number((f.namedItem(name) as HTMLInputElement).value);
    const c = (name: string) => (f.namedItem(name) as HTMLInputElement).checked;
    this.settings.update({
      quality: (f.namedItem('quality') as HTMLSelectElement).value as Settings['quality'],
      brightness: n('brightness'),
      volume: n('volume'),
      mouseSensitivity: n('mouseSensitivity'),
      gamepadSensitivity: n('gamepadSensitivity'),
      fov: n('fov'),
      subtitles: c('subtitles'),
      invertY: c('invertY'),
      headBob: c('headBob'),
    });
  }

  private writeForm(s: Readonly<Settings>): void {
    const f = this.form.elements;
    const set = (name: string, value: string) => ((f.namedItem(name) as HTMLInputElement).value = value);
    const check = (name: string, value: boolean) => ((f.namedItem(name) as HTMLInputElement).checked = value);
    const out = (name: string, value: string) => ((f.namedItem(`${name}Out`) as HTMLOutputElement).value = value);
    set('quality', s.quality);
    set('brightness', String(s.brightness));
    out('brightness', `${Math.round(s.brightness * 100)}%`);
    set('volume', String(s.volume));
    out('volume', `${Math.round(s.volume * 100)}%`);
    set('mouseSensitivity', String(s.mouseSensitivity));
    out('mouseSensitivity', s.mouseSensitivity.toFixed(2));
    set('gamepadSensitivity', String(s.gamepadSensitivity));
    out('gamepadSensitivity', s.gamepadSensitivity.toFixed(2));
    set('fov', String(s.fov));
    out('fov', `${s.fov}°`);
    check('subtitles', s.subtitles);
    check('invertY', s.invertY);
    check('headBob', s.headBob);
    this.subtitlesEnabled = s.subtitles;
    if (!s.subtitles) this.clearSubtitle();
  }
}
