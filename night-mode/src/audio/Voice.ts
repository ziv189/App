import { assetUrl } from '../assets/Assets';
import type { AudioEngine, PlayOptions, SoundHandle } from './AudioEngine';

export interface VoiceLine {
  speaker: string;
  text: string;
  duration: number;
  /** Mouth shapes over time: [seconds, viseme name]. */
  visemes: [number, string][];
}

export interface SpeakerStyle {
  label: string;
  color: string;
}

export const SPEAKERS: Record<string, SpeakerStyle> = {
  wren: { label: 'WREN', color: '#a9c8ff' },
  ivy: { label: 'IVY', color: '#ffb8c6' },
  ivyrec: { label: 'IVY (recording)', color: '#ffd2b8' },
  dana: { label: 'DANA', color: '#ecd9ae' },
  dana_home: { label: 'DANA (home video)', color: '#ecd9ae' },
  dana_phone: { label: 'DANA (voicemail)', color: '#ecd9ae' },
};

export interface SayOptions extends Omit<PlayOptions, 'bus'> {
  /** Show subtitles (default true). */
  subtitle?: boolean;
}

/**
 * Voice lines: plays the generated speech (see tools/tts/make_voices.py), shows subtitles and exposes
 * the current mouth shape for characters' lip-sync.
 */
export class Voice {
  index: Record<string, VoiceLine> = {};
  onSubtitle: ((style: SpeakerStyle, text: string) => void) | null = null;
  onSubtitleClear: (() => void) | null = null;
  private current: { id: string; line: VoiceLine; handle: SoundHandle } | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly audio: AudioEngine) {}

  async init(): Promise<void> {
    const res = await fetch(assetUrl('assets/audio/voice/index.json'));
    this.index = (await res.json()) as Record<string, VoiceLine>;
  }

  line(id: string): VoiceLine {
    const l = this.index[id];
    if (!l) throw new Error(`Unknown voice line ${id}`);
    return l;
  }

  preload(ids: readonly string[]): Promise<unknown> {
    return this.audio.preload(ids.map((id) => `voice/${id}`));
  }

  get speaking(): boolean {
    return this.current !== null;
  }

  get currentId(): string | null {
    return this.current?.id ?? null;
  }

  /** Plays a line (queued after any line still playing). Resolves when it has finished. */
  say(id: string, opts: SayOptions = {}): Promise<void> {
    const run = async () => {
      const line = this.line(id);
      const style = SPEAKERS[line.speaker] ?? { label: line.speaker.toUpperCase(), color: '#ffffff' };
      this.audio.duck(true);
      const handle = await this.audio.play(`voice/${id}`, { reverb: 0.25, ...opts, bus: 'voice' });
      this.current = { id, line, handle };
      if (opts.subtitle !== false) this.onSubtitle?.(style, line.text);
      await handle.ended;
      if (this.current?.handle === handle) {
        this.current = null;
        this.onSubtitleClear?.();
      }
      this.audio.duck(false);
    };
    this.queue = this.queue.then(run, run);
    return this.queue;
  }

  /** Stops the line that is playing (e.g. the player skipped it). */
  stop(): void {
    this.current?.handle.stop(0.08);
  }

  /** Mouth shape for a speaker right now: viseme name and how open (0..1). */
  mouth(speaker?: string): { viseme: string; weight: number } {
    const c = this.current;
    if (!c || (speaker && c.line.speaker !== speaker)) return { viseme: 'sil', weight: 0 };
    const t = this.audio.ctx.currentTime - c.handle.startedAt;
    const v = c.line.visemes;
    let i = 0;
    while (i + 1 < v.length && v[i + 1]![0] <= t) i++;
    const [start, name] = v[i] ?? [0, 'sil'];
    const end = v[i + 1]?.[0] ?? start + 0.1;
    // ease in over the first 40% of each mouth shape so shapes blend instead of snapping
    const k = Math.min(1, Math.max(0, (t - start) / Math.max(0.03, (end - start) * 0.4)));
    return { viseme: name, weight: name === 'sil' ? 0 : k };
  }
}
