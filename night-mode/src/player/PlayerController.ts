import { Euler, MathUtils, Vector3, type PerspectiveCamera } from 'three';
import type { InputFrame } from '../input/Input';
import type { Vec2 } from '../input/math';
import { collisionGroups, LAYER, RAPIER, type Physics } from '../physics/Physics';

/** Movement feel. Tweak live from the debug panel (` key). */
export interface PlayerTuning {
  /** m/s. A slow, deliberate pace; horror is about looking, not rushing. */
  walkSpeed: number;
  runSpeed: number;
  crouchSpeed: number;
  /** How quickly Daniel reaches his target speed (m/s^2). Lower = heavier. */
  acceleration: number;
  /** How quickly he stops when the keys are released (m/s^2). */
  deceleration: number;
  /** Head-bob strength multiplier (0 disables it; the settings menu also has an on/off switch). */
  headBob: number;
}

export const DEFAULT_TUNING: PlayerTuning = {
  walkSpeed: 1.55,
  runSpeed: 3.1,
  crouchSpeed: 0.85,
  acceleration: 8,
  deceleration: 11,
  headBob: 1,
};

// Daniel is 1.80 m tall; his eyes sit ~12 cm below the top of his head.
const RADIUS = 0.28;
const STAND_HEIGHT = 1.8;
const CROUCH_HEIGHT = 1.2;
const EYE_BELOW_TOP = 0.12;
const STAND_EYE = STAND_HEIGHT - EYE_BELOW_TOP;
const CROUCH_EYE = CROUCH_HEIGHT - EYE_BELOW_TOP;
/** Gap the character controller keeps between the capsule and the world. */
const SKIN = 0.02;
const MAX_PITCH = MathUtils.degToRad(85);
/** Metres walked per full head-bob cycle (two footsteps). */
const STRIDE = 1.5;
const GRAVITY = 9.81;

const halfHeightFor = (height: number) => height / 2 - RADIUS;

/**
 * First-person body: a capsule moved by Rapier's kinematic character controller (walls, stairs up to
 * 30 cm, slopes up to 45 degrees, stays glued to the floor going downstairs), plus the camera on top.
 *
 * Movement runs in fixed steps (fixedUpdate); the camera is updated every rendered frame (update)
 * and interpolated between steps so it is smooth on any refresh rate.
 */
export class PlayerController {
  yaw = 0;
  pitch = 0;
  tuning: PlayerTuning = { ...DEFAULT_TUNING };
  /** Fired on each footstep with the current speed (m/s). */
  onFootstep: ((speed: number) => void) | null = null;
  /** Cutscenes and menus: no walking (moveLocked) and/or no looking around (lookLocked). */
  moveLocked = false;
  lookLocked = false;
  private lookTarget: { yaw: number; pitch: number; speed: number; resolve: () => void } | null = null;
  private shakeAmount = 0;
  private shakeTime = 0;
  private breathPhase = 0;

  private readonly collider: RAPIER.Collider;
  private readonly kcc: RAPIER.KinematicCharacterController;
  private readonly feet = new Vector3();
  private readonly prevFeet = new Vector3();
  private readonly renderFeet = new Vector3();
  private readonly velocity = new Vector3();
  private readonly euler = new Euler(0, 0, 0, 'YXZ');
  private height = STAND_HEIGHT;
  private wantsCrouch = false;
  private grounded = false;
  private crouchBlend = 0;
  private bobPhase = 0;
  private bobWeight = 0;

  constructor(
    private readonly physics: Physics,
    private readonly camera: PerspectiveCamera,
  ) {
    const world = physics.world;
    this.kcc = world.createCharacterController(SKIN);
    this.kcc.setMaxSlopeClimbAngle(MathUtils.degToRad(45));
    this.kcc.setMinSlopeSlideAngle(MathUtils.degToRad(50));
    this.kcc.enableAutostep(0.3, 0.15, false);
    this.kcc.enableSnapToGround(0.3);
    this.kcc.setApplyImpulsesToDynamicBodies(true);
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(halfHeightFor(STAND_HEIGHT), RADIUS).setCollisionGroups(
        collisionGroups(LAYER.PLAYER, LAYER.WORLD),
      ),
    );
  }

  /** Places the player with their feet at `feet`, facing `yaw` (radians; 0 looks down -Z). */
  teleport(feet: Vector3, yaw: number, pitch = 0): void {
    this.feet.copy(feet);
    this.prevFeet.copy(feet);
    this.renderFeet.copy(feet);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = pitch;
    this.lookTarget = null;
    this.syncCollider();
  }

  /** Turns the head to look at a world point over about `seconds`. Resolves when there. */
  lookAt(point: Vector3, seconds = 0.8): Promise<void> {
    const eye = this.camera.position;
    const dx = point.x - eye.x;
    const dy = point.y - eye.y;
    const dz = point.z - eye.z;
    let yaw = Math.atan2(-dx, -dz);
    // turn the short way round
    while (yaw - this.yaw > Math.PI) yaw -= Math.PI * 2;
    while (yaw - this.yaw < -Math.PI) yaw += Math.PI * 2;
    const pitch = Math.atan2(dy, Math.hypot(dx, dz));
    this.lookTarget?.resolve();
    return new Promise((resolve) => {
      this.lookTarget = { yaw, pitch: MathUtils.clamp(pitch, -MAX_PITCH, MAX_PITCH), speed: 4 / Math.max(0.1, seconds), resolve };
    });
  }

  /** Screen shake: `amount` in radians of wobble, decaying over `seconds`. */
  shake(amount: number, seconds: number): void {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeTime = Math.max(this.shakeTime, seconds);
  }

  get eyeHeight(): number {
    return this.isCrouched ? CROUCH_EYE : STAND_EYE;
  }

  /** Forces a crouch state (e.g. when a hiding scene ends). */
  setCrouch(on: boolean): void {
    this.wantsCrouch = on;
  }

  toggleCrouch(): void {
    this.wantsCrouch = !this.wantsCrouch;
  }

  get position(): Readonly<Vector3> {
    return this.feet;
  }
  get isGrounded(): boolean {
    return this.grounded;
  }
  get isCrouched(): boolean {
    return this.height < STAND_HEIGHT;
  }
  get horizontalSpeed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** One physics step of movement. */
  fixedUpdate(dt: number, input: InputFrame): void {
    this.prevFeet.copy(this.feet);
    this.updateCrouch();

    const t = this.tuning;
    if (this.moveLocked) input = { ...input, move: { x: 0, y: 0 }, sprint: false };
    const running = input.sprint && input.move.y > 0.3 && !this.isCrouched;
    const speed = this.isCrouched ? t.crouchSpeed : running ? t.runSpeed : t.walkSpeed;

    // Desired velocity in world space (forward is -Z rotated by yaw).
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const wishX = (input.move.x * cos - input.move.y * sin) * speed;
    const wishZ = (-input.move.x * sin - input.move.y * cos) * speed;
    const moving = input.move.x !== 0 || input.move.y !== 0;
    const maxChange = (moving ? t.acceleration : t.deceleration) * dt;
    const dx = wishX - this.velocity.x;
    const dz = wishZ - this.velocity.z;
    const diff = Math.hypot(dx, dz);
    if (diff <= maxChange) {
      this.velocity.x = wishX;
      this.velocity.z = wishZ;
    } else {
      this.velocity.x += (dx / diff) * maxChange;
      this.velocity.z += (dz / diff) * maxChange;
    }

    // Small constant push down while grounded keeps the controller in contact with the floor.
    this.velocity.y = this.grounded ? -1 : Math.max(this.velocity.y - GRAVITY * dt, -30);

    this.kcc.computeColliderMovement(this.collider, {
      x: this.velocity.x * dt,
      y: this.velocity.y * dt,
      z: this.velocity.z * dt,
    });
    const moved = this.kcc.computedMovement();
    const c = this.collider.translation();
    this.collider.setTranslation({ x: c.x + moved.x, y: c.y + moved.y, z: c.z + moved.z });
    this.grounded = this.kcc.computedGrounded();

    // Keep only the motion that actually happened, so pushing into a wall doesn't store up speed.
    this.velocity.x = moved.x / dt;
    this.velocity.z = moved.z / dt;
    if (this.grounded) this.velocity.y = 0;

    const center = this.collider.translation();
    this.feet.set(center.x, center.y - this.height / 2 - SKIN, center.z);
  }

  /** Per rendered frame: apply look input and place the camera. */
  update(dt: number, alpha: number, look: Vec2, headBobEnabled: boolean): void {
    if (this.lookTarget) {
      const k = 1 - Math.exp(-this.lookTarget.speed * dt);
      this.yaw += (this.lookTarget.yaw - this.yaw) * k;
      this.pitch += (this.lookTarget.pitch - this.pitch) * k;
      if (Math.abs(this.lookTarget.yaw - this.yaw) < 0.01 && Math.abs(this.lookTarget.pitch - this.pitch) < 0.01) {
        this.lookTarget.resolve();
        this.lookTarget = null;
      }
    } else if (!this.lookLocked) {
      this.yaw -= look.x;
      this.pitch = MathUtils.clamp(this.pitch + look.y, -MAX_PITCH, MAX_PITCH);
    }

    this.crouchBlend = MathUtils.damp(this.crouchBlend, this.isCrouched ? 1 : 0, 10, dt);
    const eye = MathUtils.lerp(STAND_EYE, CROUCH_EYE, MathUtils.smoothstep(this.crouchBlend, 0, 1));
    this.renderFeet.lerpVectors(this.prevFeet, this.feet, alpha);

    // Head bob: vertical dip once per footstep, lateral sway once per stride.
    const speed = this.horizontalSpeed;
    const target = this.grounded ? Math.min(speed / this.tuning.walkSpeed, 1.5) : 0;
    this.bobWeight = MathUtils.damp(this.bobWeight, target, 6, dt);
    const previousPhase = this.bobPhase;
    this.bobPhase += (speed / STRIDE) * Math.PI * 2 * dt;
    // A foot lands at the bottom of each vertical dip (phase = 3pi/4 + k*pi).
    const step = (p: number) => Math.floor((p - (3 * Math.PI) / 4) / Math.PI);
    if (step(this.bobPhase) !== step(previousPhase) && this.grounded && speed > 0.3) this.onFootstep?.(speed);
    // Wrap by a whole number of cycles so the value never grows large (keeps float precision).
    if (this.bobPhase > Math.PI * 64) this.bobPhase -= Math.PI * 64;

    const amount = headBobEnabled ? this.tuning.headBob * this.bobWeight : 0;
    const bobY = Math.sin(this.bobPhase * 2) * 0.028 * amount;
    const bobX = Math.sin(this.bobPhase) * 0.018 * amount;

    // idle breathing sway and shake
    this.breathPhase += dt * 1.6;
    let pitchOff = Math.sin(this.breathPhase) * 0.0035 * (1 - Math.min(1, speed / 0.5));
    let yawOff = 0;
    let roll = 0;
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const a = this.shakeAmount * Math.min(1, Math.max(0, this.shakeTime));
      pitchOff += (Math.random() - 0.5) * a;
      yawOff += (Math.random() - 0.5) * a;
      roll += (Math.random() - 0.5) * a * 0.6;
      if (this.shakeTime <= 0) this.shakeAmount = 0;
    }
    this.euler.set(this.pitch + pitchOff, this.yaw + yawOff, roll);
    this.camera.quaternion.setFromEuler(this.euler);
    this.camera.position.set(
      this.renderFeet.x + Math.cos(this.yaw) * bobX,
      this.renderFeet.y + eye + bobY,
      this.renderFeet.z - Math.sin(this.yaw) * bobX,
    );
  }

  /** Grows/shrinks the capsule, only standing up when there is headroom. */
  private updateCrouch(): void {
    const targetHeight = this.wantsCrouch ? CROUCH_HEIGHT : STAND_HEIGHT;
    if (targetHeight === this.height) return;
    if (targetHeight > this.height && !this.hasHeadroom(targetHeight)) return;
    this.height = targetHeight;
    this.collider.setHalfHeight(halfHeightFor(targetHeight));
    this.syncCollider();
  }

  private hasHeadroom(height: number): boolean {
    const center = { x: this.feet.x, y: this.feet.y + SKIN + height / 2, z: this.feet.z };
    const probe = new RAPIER.Capsule(halfHeightFor(height), RADIUS - 0.01);
    const blocker = this.physics.world.intersectionWithShape(
      center,
      { x: 0, y: 0, z: 0, w: 1 },
      probe,
      undefined,
      undefined,
      this.collider,
    );
    return blocker === null;
  }

  private syncCollider(): void {
    this.collider.setTranslation({ x: this.feet.x, y: this.feet.y + SKIN + this.height / 2, z: this.feet.z });
  }
}
