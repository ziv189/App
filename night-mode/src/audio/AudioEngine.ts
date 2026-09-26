import { Vector3, type Camera, type Object3D } from 'three';
import { assetUrl } from '../assets/Assets';
import type { ReverbKind } from '../world/Cell';

export type Bus = 'music' | 'ambience' | 'sfx' | 'voice' | 'ui';

export interface PlayOptions {
  bus?: Bus;
  volume?: number;
  /** Playback rate (pitch and speed). */
  rate?: number;
  loop?: boolean;
  /** World position (or object to follow) for 3D sound; omitted = plays "everywhere" (stereo). */
  at?: Vector3 | Object3D;
  /** Distance at which the volume starts to fall off (metres). */
  refDistance?: number;
  fadeIn?: number;
  /** Seconds into the file to start. */
  offset?: number;
  /** 0..1 amount sent to the room's reverb. */
  reverb?: number;
  /** Low-pass cutoff (Hz) for sounds heard through walls / from devices. */
  lowpass?: number;
}

export interface SoundHandle {
  readonly name: string;
  readonly ended: Promise<void>;
  readonly source: AudioBufferSourceNode;
  readonly startedAt: number;
  stop(fade?: number): void;
  setVolume(volume: number, ramp?: number): void;
  setRate(rate: number, ramp?: number): void;
  readonly playing: boolean;
}

const BUS_VOLUME: Record<Bus, number> = { music: 0.55, ambience: 0.7, sfx: 0.9, voice: 1.0, ui: 0.7 };

const REVERB: Record<ReverbKind, { seconds: number; damp: number; level: number; predelay: number }> = {
  room: { seconds: 0.7, damp: 5000, level: 0.22, predelay: 0.008 },
  small: { seconds: 0.55, damp: 7000, level: 0.3, predelay: 0.004 },
  hall: { seconds: 1.5, damp: 4200, level: 0.28, predelay: 0.014 },
  basement: { seconds: 1.9, damp: 2400, level: 0.34, predelay: 0.012 },
  outdoor: { seconds: 0.9, damp: 3000, level: 0.08, predelay: 0.03 },
};

/**
 * Web Audio mixer: buses (music, ambience, effects, voice, UI) into a master, a convolution reverb that
 * follows the current room, 3D sounds (HRTF panning) and music/ambience crossfades.
 * The AudioContext can only start after a click, so create() must be called from one.
 */
export class AudioEngine {
  readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly buses = {} as Record<Bus, GainNode>;
  private readonly duckGain: GainNode;
  private readonly reverb: ConvolverNode;
  private readonly reverbReturn: GainNode;
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly followers: { handle: SoundHandle; panner: PannerNode; target: Object3D }[] = [];
  private musicHandle: SoundHandle | null = null;
  private musicName = '';
  private ambienceHandles = new Map<string, SoundHandle>();
  private ducks = 0;
  private reverbKind: ReverbKind | null = null;
  private readonly tmp = new Vector3();
  private readonly fwd = new Vector3();
  private readonly up = new Vector3();

  constructor() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    this.master.connect(limiter).connect(this.ctx.destination);
    this.duckGain = this.ctx.createGain();
    this.duckGain.connect(this.master);
    for (const bus of Object.keys(BUS_VOLUME) as Bus[]) {
      const g = this.ctx.createGain();
      g.gain.value = BUS_VOLUME[bus];
      // music and ambience duck under dialogue; everything else goes straight to the master
      g.connect(bus === 'music' || bus === 'ambience' ? this.duckGain : this.master);
      this.buses[bus] = g;
    }
    this.reverb = this.ctx.createConvolver();
    this.reverbReturn = this.ctx.createGain();
    this.reverb.connect(this.reverbReturn).connect(this.master);
    this.setReverb('room');
  }

  resume(): Promise<void> {
    return this.ctx.state === 'running' ? Promise.resolve() : this.ctx.resume();
  }

  setMasterVolume(v: number): void {
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  setBusVolume(bus: Bus, v: number): void {
    this.buses[bus].gain.setTargetAtTime(BUS_VOLUME[bus] * v, this.ctx.currentTime, 0.05);
  }

  /** Synthetic impulse response: decaying stereo noise, darker as it decays. */
  setReverb(kind: ReverbKind): void {
    if (kind === this.reverbKind) return;
    this.reverbKind = kind;
    const r = REVERB[kind];
    const sr = this.ctx.sampleRate;
    const n = Math.floor((r.seconds + r.predelay) * sr);
    const ir = this.ctx.createBuffer(2, n, sr);
    const pre = Math.floor(r.predelay * sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lp = 0;
      for (let i = pre; i < n; i++) {
        const t = (i - pre) / sr;
        const decay = Math.exp((-6.9 * t) / r.seconds);
        // one-pole low-pass whose cutoff falls over time: bright early reflections, dark tail
        const cutoff = r.damp * Math.exp(-t * 2.2) + 400;
        const a = Math.exp((-2 * Math.PI * cutoff) / sr);
        lp = (1 - a) * (Math.random() * 2 - 1) + a * lp;
        d[i] = lp * decay;
      }
    }
    this.reverb.buffer = ir;
    this.reverbReturn.gain.setTargetAtTime(r.level * 3.2, this.ctx.currentTime, 0.2);
  }

  url(name: string): string {
    if (name.startsWith('voice/') || name.startsWith('music/')) return assetUrl(`assets/audio/${name}.ogg`);
    return assetUrl(`assets/audio/sfx/${name}.ogg`);
  }

  load(name: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(name);
    if (!p) {
      p = fetch(this.url(name))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((data) => this.ctx.decodeAudioData(data))
        .catch((err: unknown) => {
          console.warn(`sound ${name} failed to load`, err);
          return null;
        });
      this.buffers.set(name, p);
    }
    return p;
  }

  preload(names: readonly string[]): Promise<unknown> {
    return Promise.all(names.map((n) => this.load(n)));
  }

  /** Plays a sound. Resolves once the buffer is decoded (usually instantly: preloaded). */
  async play(name: string, opts: PlayOptions = {}): Promise<SoundHandle> {
    const buffer = await this.load(name);
    return this.start(name, buffer, opts);
  }

  /** Plays one of several recorded variants (<name>_1 .. <name>_<count>), picked at random. */
  playVariant(name: string, count: number, opts: PlayOptions = {}): Promise<SoundHandle> {
    return this.play(`${name}_${1 + Math.floor(Math.random() * count)}`, opts);
  }

  private start(name: string, buffer: AudioBuffer | null, opts: PlayOptions): SoundHandle {
    const ctx = this.ctx;
    const source = ctx.createBufferSource();
    source.buffer = buffer ?? ctx.createBuffer(1, 1, ctx.sampleRate);
    source.loop = opts.loop ?? false;
    source.playbackRate.value = opts.rate ?? 1;
    const gain = ctx.createGain();
    const volume = opts.volume ?? 1;
    const now = ctx.currentTime;
    if (opts.fadeIn) {
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + opts.fadeIn);
    } else {
      gain.gain.value = volume;
    }
    let node: AudioNode = source;
    if (opts.lowpass) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = opts.lowpass;
      node = node.connect(lp);
    }
    node = node.connect(gain);
    let panner: PannerNode | null = null;
    if (opts.at) {
      panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = opts.refDistance ?? 1.2;
      panner.rolloffFactor = 1.2;
      panner.maxDistance = 60;
      const p = opts.at instanceof Vector3 ? opts.at : (opts.at as Object3D).getWorldPosition(this.tmp);
      panner.positionX.value = p.x;
      panner.positionY.value = p.y;
      panner.positionZ.value = p.z;
      node = node.connect(panner);
    }
    const bus = this.buses[opts.bus ?? 'sfx'];
    node.connect(bus);
    const send = opts.reverb ?? (opts.bus === 'music' || opts.bus === 'ui' ? 0 : 0.35);
    if (send > 0) {
      const s = ctx.createGain();
      s.gain.value = send;
      node.connect(s).connect(this.reverb);
    }
    let playing = true;
    let resolveEnded!: () => void;
    const ended = new Promise<void>((r) => (resolveEnded = r));
    source.onended = () => {
      playing = false;
      resolveEnded();
      source.disconnect();
      gain.disconnect();
      panner?.disconnect();
    };
    source.start(now, opts.offset ?? 0);
    const handle: SoundHandle = {
      name,
      ended,
      source,
      startedAt: now,
      get playing() {
        return playing;
      },
      stop: (fade = 0.05) => {
        if (!playing) return;
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + Math.max(0.01, fade));
        try {
          source.stop(t + Math.max(0.01, fade) + 0.02);
        } catch {
          /* already stopped */
        }
      },
      setVolume: (v, ramp = 0.1) => {
        gain.gain.setTargetAtTime(v, ctx.currentTime, Math.max(0.005, ramp / 3));
      },
      setRate: (r, ramp = 0.1) => {
        source.playbackRate.setTargetAtTime(r, ctx.currentTime, Math.max(0.005, ramp / 3));
      },
    };
    if (panner && opts.at && !(opts.at instanceof Vector3)) this.followers.push({ handle, panner, target: opts.at });
    return handle;
  }

  /** Crossfades to a music track (looping unless `loop: false`). An empty name fades music out. */
  async music(name: string, opts: { volume?: number; fade?: number; loop?: boolean } = {}): Promise<void> {
    if (name === this.musicName && this.musicHandle?.playing) {
      this.musicHandle.setVolume(opts.volume ?? 1, opts.fade ?? 2);
      return;
    }
    this.musicName = name;
    const old = this.musicHandle;
    old?.stop(opts.fade ?? 2);
    this.musicHandle = null;
    if (!name) return;
    const handle = await this.play(`music/${name}`, {
      bus: 'music',
      loop: opts.loop ?? true,
      volume: opts.volume ?? 1,
      fadeIn: opts.fade ?? 2,
    });
    if (this.musicName !== name) {
      handle.stop(0.2);
      return;
    }
    this.musicHandle = handle;
  }

  get currentMusic(): string {
    return this.musicName;
  }

  /** Sets the looping background sounds; others fade out. */
  ambience(beds: readonly { sound: string; volume: number }[], fade = 1.5): void {
    const wanted = new Map(beds.map((b) => [b.sound, b.volume]));
    for (const [sound, handle] of this.ambienceHandles) {
      if (!wanted.has(sound)) {
        handle.stop(fade);
        this.ambienceHandles.delete(sound);
      }
    }
    for (const [sound, volume] of wanted) {
      const existing = this.ambienceHandles.get(sound);
      if (existing) {
        existing.setVolume(volume, fade);
        continue;
      }
      void this.play(sound, { bus: 'ambience', loop: true, volume, fadeIn: fade, reverb: 0 }).then((h) => {
        if (this.ambienceHandles.has(sound) || !wanted.has(sound)) {
          h.stop(0.1);
          return;
        }
        this.ambienceHandles.set(sound, h);
      });
    }
  }

  /** Lowers music and ambience while someone speaks (nested calls stack). */
  duck(on: boolean): void {
    this.ducks = Math.max(0, this.ducks + (on ? 1 : -1));
    this.duckGain.gain.setTargetAtTime(this.ducks > 0 ? 0.45 : 1, this.ctx.currentTime, on ? 0.08 : 0.4);
  }

  /** Places the listener at the camera. Call once per frame. */
  updateListener(camera: Camera): void {
    const l = this.ctx.listener;
    camera.getWorldPosition(this.tmp);
    this.fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(this.tmp.x, t, 0.02);
      l.positionY.setTargetAtTime(this.tmp.y, t, 0.02);
      l.positionZ.setTargetAtTime(this.tmp.z, t, 0.02);
      l.forwardX.setTargetAtTime(this.fwd.x, t, 0.02);
      l.forwardY.setTargetAtTime(this.fwd.y, t, 0.02);
      l.forwardZ.setTargetAtTime(this.fwd.z, t, 0.02);
      l.upX.setTargetAtTime(this.up.x, t, 0.02);
      l.upY.setTargetAtTime(this.up.y, t, 0.02);
      l.upZ.setTargetAtTime(this.up.z, t, 0.02);
    } else {
      l.setPosition(this.tmp.x, this.tmp.y, this.tmp.z);
      l.setOrientation(this.fwd.x, this.fwd.y, this.fwd.z, this.up.x, this.up.y, this.up.z);
    }
    for (let i = this.followers.length - 1; i >= 0; i--) {
      const f = this.followers[i]!;
      if (!f.handle.playing) {
        this.followers.splice(i, 1);
        continue;
      }
      f.target.getWorldPosition(this.tmp);
      f.panner.positionX.setTargetAtTime(this.tmp.x, t, 0.02);
      f.panner.positionY.setTargetAtTime(this.tmp.y, t, 0.02);
      f.panner.positionZ.setTargetAtTime(this.tmp.z, t, 0.02);
    }
  }

  stopAll(fade = 0.5): void {
    this.musicHandle?.stop(fade);
    this.musicHandle = null;
    this.musicName = '';
    for (const h of this.ambienceHandles.values()) h.stop(fade);
    this.ambienceHandles.clear();
  }
}
