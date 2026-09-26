import {
  AnimationMixer,
  MathUtils,
  Quaternion,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Bone,
  type Object3D,
  type SkinnedMesh,
} from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

const VISEMES = ['sil', 'PP', 'FF', 'TH', 'DD', 'kk', 'CH', 'SS', 'nn', 'RR', 'aa', 'E', 'I', 'O', 'U'];

/** How strongly each viseme also opens the jaw (visemes alone read a little tight on these faces). */
const JAW: Record<string, number> = { aa: 0.45, E: 0.25, I: 0.15, O: 0.35, U: 0.18, CH: 0.12, SS: 0.06, RR: 0.15, DD: 0.12, kk: 0.14, nn: 0.08, TH: 0.1 };

export interface Expression {
  smile: number;
  sad: number;
  eyesWide: number;
  /** >1 overdrives the jaw past what a face can do. Used once or twice, sparingly. */
  jaw: number;
  browsUp: number;
}

/**
 * A Rocketbox character: skinned body, ARKit-style face shapes and visemes, animation clips.
 * The face blinks by itself, follows a look target with head and eyes, and lip-syncs to a mouth shape
 * fed in every frame (from Voice.mouth()).
 */
export class Character {
  readonly root: Object3D;
  readonly mixer: AnimationMixer;
  readonly actions = new Map<string, AnimationAction>();
  blinking = true;
  expression: Expression = { smile: 0, sad: 0, eyesWide: 0, jaw: 0, browsUp: 0 };
  /** World point to look at (head and eyes), or null to look ahead. */
  lookTarget: Vector3 | null = null;
  headWeight = 0.8;
  /** The way the face points in the model's own space (Rocketbox exports face +Z). */
  forward = new Vector3(0, 0, 1);
  private readonly faces: SkinnedMesh[] = [];
  private head: Bone | null = null;
  private blinkTimer = 2;
  private blinkPhase = -1;
  private readonly visemeWeights = new Map<string, number>();
  /** Bone rotations applied on top of the animation (see addPoseFix). */
  private readonly poseFixes: { bone: Object3D; q: Quaternion }[] = [];
  private readonly current: Expression = { smile: 0, sad: 0, eyesWide: 0, jaw: 0, browsUp: 0 };
  private readonly tmpQ = new Quaternion();
  private readonly tmpV = new Vector3();
  private active: AnimationAction | null = null;

  constructor(gltf: GLTF, clone = true) {
    this.root = clone ? SkeletonUtils.clone(gltf.scene) : gltf.scene;
    this.mixer = new AnimationMixer(this.root);
    for (const clip of gltf.animations as AnimationClip[]) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.root.traverse((o) => {
      const m = o as SkinnedMesh;
      if (m.isMesh) {
        m.frustumCulled = false; // skinned bounds don't follow the pose
        m.castShadow = true;
        m.receiveShadow = true;
        if (m.morphTargetDictionary && m.morphTargetInfluences) this.faces.push(m);
      }
      if ((o as Bone).isBone && o.name.replace(/[_ ]/g, '').toLowerCase().endsWith('head') && !this.head) this.head = o as Bone;
    });
  }

  /**
   * Turns a bone by `degrees` about its own `axis` after every animation update. The mocap idle was made
   * for a different rest pose and holds the arms out; this lowers them for full-body appearances.
   */
  addPoseFix(boneName: string, axis: Vector3, degrees: number): void {
    const bone = this.root.getObjectByName(boneName);
    if (bone) this.poseFixes.push({ bone, q: new Quaternion().setFromAxisAngle(axis, (degrees * Math.PI) / 180) });
  }

  play(name: string, fade = 0.4): void {
    const next = this.actions.get(name);
    if (!next || next === this.active) return;
    next.reset().fadeIn(fade).play();
    this.active?.fadeOut(fade);
    this.active = next;
  }

  private set(name: string, value: number): void {
    for (const m of this.faces) {
      const i = m.morphTargetDictionary![name];
      if (i !== undefined) m.morphTargetInfluences![i] = value;
    }
  }

  update(dt: number, mouth: { viseme: string; weight: number } = { viseme: 'sil', weight: 0 }): void {
    this.mixer.update(dt);
    for (const f of this.poseFixes) f.bone.quaternion.multiply(f.q);
    // blinking
    if (this.blinking) {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0 && this.blinkPhase < 0) {
        this.blinkPhase = 0;
        this.blinkTimer = 2 + Math.random() * 4;
      }
    }
    let blink = 0;
    if (this.blinkPhase >= 0) {
      this.blinkPhase += dt / 0.16;
      blink = Math.sin(Math.min(1, this.blinkPhase) * Math.PI);
      if (this.blinkPhase >= 1) this.blinkPhase = -1;
    }

    // expressions ease towards their targets
    const e = this.expression;
    const c = this.current;
    for (const k of Object.keys(c) as (keyof Expression)[]) c[k] = MathUtils.damp(c[k], e[k], 8, dt);

    // visemes: the current shape rises, the others fall
    for (const v of VISEMES) {
      const target = v === mouth.viseme ? mouth.weight : 0;
      const w = MathUtils.damp(this.visemeWeights.get(v) ?? 0, target, 18, dt);
      this.visemeWeights.set(v, w);
      this.set(`viseme_${v}`, w * 0.9);
    }
    let jaw = c.jaw;
    for (const [v, j] of Object.entries(JAW)) jaw += (this.visemeWeights.get(v) ?? 0) * j;

    this.set('eyeBlinkLeft', Math.max(blink, c.smile * 0.25));
    this.set('eyeBlinkRight', Math.max(blink, c.smile * 0.25));
    this.set('mouthSmileLeft', c.smile);
    this.set('mouthSmileRight', c.smile);
    this.set('cheekSquintLeft', c.smile * 0.5);
    this.set('cheekSquintRight', c.smile * 0.5);
    this.set('mouthFrownLeft', c.sad * 0.8);
    this.set('mouthFrownRight', c.sad * 0.8);
    this.set('browInnerUp', Math.max(c.sad * 0.7, c.browsUp));
    this.set('eyeWideLeft', c.eyesWide);
    this.set('eyeWideRight', c.eyesWide);
    this.set('jawOpen', jaw);

    // head turns towards the look target (in world space, so the bone's own axes don't matter)
    if (this.head && this.lookTarget) {
      const headPos = this.head.getWorldPosition(this.tmpV);
      const d = this.lookTarget.clone().sub(headPos).normalize();
      const f = this.forward.clone().applyQuaternion(this.root.getWorldQuaternion(this.tmpQ));
      const angle = f.angleTo(d);
      const turn = new Quaternion().setFromUnitVectors(f, d);
      const limited = new Quaternion().slerp(turn, Math.min(1, 1.0 / Math.max(angle, 1e-3)) * this.headWeight);
      const headW = this.head.getWorldQuaternion(new Quaternion());
      const parentW = this.head.parent!.getWorldQuaternion(new Quaternion());
      this.head.quaternion.copy(parentW.invert().multiply(limited.multiply(headW)));
    }
  }
}
