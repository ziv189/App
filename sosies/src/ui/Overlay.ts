import type { Settings, SettingsStore } from '../core/Settings';
import type { QualityLevel } from '../render/quality';

export type ScreenName = 'loading' | 'start' | 'pause' | 'error' | 'none';

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as T;
};

/** The HTML menus layered over the 3D view (loading, start, pause/settings, error) and the HUD. */
export class Overlay {
  onStart: (() => void) | null = null;
  onResume: (() => void) | null = null;

  private readonly screens: Record<Exclude<ScreenName, 'none'>, HTMLElement> = {
    loading: $('screen-loading'),
    start: $('screen-start'),
    pause: $('screen-pause'),
    error: $('screen-error'),
  };
  private readonly hud = $('hud');
  private readonly form = $<HTMLFormElement>('settings-form');
  private current: ScreenName = 'loading';

  constructor(private readonly settings: SettingsStore) {
    $('btn-start').addEventListener('click', () => this.onStart?.());
    $('btn-resume').addEventListener('click', () => this.onResume?.());
    this.form.addEventListener('input', () => this.readForm());
    this.form.addEventListener('submit', (e) => e.preventDefault());
    settings.onChange((s) => this.writeForm(s));
    this.writeForm(settings.get());
  }

  get screen(): ScreenName {
    return this.current;
  }

  show(screen: ScreenName): void {
    this.current = screen;
    for (const [name, el] of Object.entries(this.screens)) el.hidden = name !== screen;
    this.hud.hidden = screen !== 'none';
    if (screen === 'pause') this.setResumeHint('');
  }

  setProgress(fraction: number, status: string): void {
    $('progress-bar').style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
    $('loading-status').textContent = status;
  }

  setStartSubtitle(text: string): void {
    $('start-subtitle').textContent = text;
  }

  setWatermark(text: string): void {
    $('watermark').textContent = text;
  }

  setResumeHint(text: string): void {
    $('resume-hint').textContent = text;
  }

  showError(message: string): void {
    $('error-text').textContent = message;
    this.show('error');
  }

  private readForm(): void {
    const f = this.form.elements;
    const value = (name: string) => (f.namedItem(name) as HTMLInputElement).value;
    const checked = (name: string) => (f.namedItem(name) as HTMLInputElement).checked;
    this.settings.update({
      quality: value('quality') as QualityLevel,
      mouseSensitivity: Number(value('mouseSensitivity')),
      gamepadSensitivity: Number(value('gamepadSensitivity')),
      fov: Number(value('fov')),
      invertY: checked('invertY'),
      headBob: checked('headBob'),
    });
  }

  private writeForm(s: Readonly<Settings>): void {
    const f = this.form.elements;
    const set = (name: string, v: string) => ((f.namedItem(name) as HTMLInputElement).value = v);
    const tick = (name: string, v: boolean) => ((f.namedItem(name) as HTMLInputElement).checked = v);
    const out = (name: string, v: string) => ((f.namedItem(name) as HTMLOutputElement).value = v);
    set('quality', s.quality);
    set('mouseSensitivity', String(s.mouseSensitivity));
    set('gamepadSensitivity', String(s.gamepadSensitivity));
    set('fov', String(s.fov));
    tick('invertY', s.invertY);
    tick('headBob', s.headBob);
    out('mouseSensitivityOut', `${s.mouseSensitivity.toFixed(2)}×`);
    out('gamepadSensitivityOut', `${s.gamepadSensitivity.toFixed(2)}×`);
    out('fovOut', `${Math.round(s.fov)}°`);
  }
}
