'use strict';
// ============================================================
//  HORA MORTIS — the pose rig
//  A small skeleton (hip, spine, head, two jointed arms and legs,
//  a weapon, a robe). Poses are keyed functions of state and are
//  blended every step, so every movement flows into the next.
// ============================================================
// Pose layout (local space facing right, +y down, angles in radians):
//   0 rx, 1 ry     hip position relative to the feet
//   2 torso        spine lean (+ forward)        3 head  tilt relative to the spine
//   4 shF, 5 elF   front (weapon) arm: upper arm angle from straight down (+ forward), elbow bend
//   6 shB, 7 elB   back arm
//   8 hipF, 9 knF  front leg: thigh angle from straight down (+ forward), knee bend
//  10 hipB, 11 knB back leg
//  12 weapon      blade angle (0 forward, +PI/2 straight down)
//  13 flare       robe flutter 0..1          14 behind  1 = weapon drawn behind the body
const PN = 15;
function newPose() { return [0, -11, 0.06, 0.06, 0.4, 0.55, -0.12, 0.3, 0.17, 0.14, -0.12, 0.14, 1.1, 0, 0]; }
function setPose(o, a) { for (let i = 0; i < PN; i++) o[i] = a[i]; return o; }
function mixPose(o, a, b, k) { for (let i = 0; i < PN; i++) o[i] = i >= 2 && i <= 12 ? a[i] + angDiff(a[i], b[i]) * k : a[i] + (b[i] - a[i]) * k; return o; }
function blendPose(cur, tgt, k) {
  cur[0] += (tgt[0] - cur[0]) * k; cur[1] += (tgt[1] - cur[1]) * k;
  for (let i = 2; i <= 12; i++) cur[i] += angDiff(cur[i], tgt[i]) * k;
  cur[13] += (tgt[13] - cur[13]) * k; cur[14] += (tgt[14] - cur[14]) * k;
}
const armToward = (ang) => Math.atan2(Math.cos(ang), Math.sin(ang)); // arm angle (from down) that points along ang
const PI = Math.PI;

// ---------- the pose library ----------
const POSE = {
  idle(o, t) {
    const b = Math.sin(t * 2.2);
    return setPose(o, [0, -11 + b * 0.3, 0.06 + b * 0.02, 0.06, 0.32, 0.5, -0.12, 0.3 + b * 0.05, 0.17, 0.14, -0.13, 0.14, 0.42 + b * 0.03, 0, 0]);
  },
  guard(o, t) { // the fallen's ready stance: blade raised across the body
    const b = Math.sin(t * 3);
    return setPose(o, [-0.5, -10.4 + b * 0.25, 0.12, 0, 1.15, 1.05, 0.25, 0.7, 0.5, 0.45, -0.45, 0.35, -0.85, 0, 0]);
  },
  run(o, ph, k) {
    const s = Math.sin(ph), c = Math.cos(ph), kk = clamp(k, 0, 1.25);
    const bob = Math.abs(Math.sin(ph)) * 1.4;
    return setPose(o, [0.5 * kk, -10.4 - bob, 0.2 + 0.14 * kk, -0.14, -0.55 + s * 0.12, 0.25, -s * 0.85 * kk + 0.15, 0.75,
      s * 0.95 * kk + 0.06, Math.max(0, c) * 1.5 * kk + 0.14, -s * 0.95 * kk + 0.06, Math.max(0, -c) * 1.5 * kk + 0.14,
      PI - 0.42 + s * 0.06, clamp(k, 0, 1), 1]);
  },
  _rise: [0, -12, 0.12, -0.06, -0.45, 0.4, 1.4, 0.5, 1.05, 1.75, -0.35, 0.95, PI + 0.55, 0.3, 1],
  _apex: [0, -11.5, 0.05, 0, 0.25, 0.8, 0.95, 0.6, 0.62, 1.25, -0.22, 0.8, PI - 0.1, 0.5, 1],
  _fall: [0, -11, -0.06, 0.12, 1.25, 0.3, 1.95, 0.2, 0.33, 0.45, -0.32, 0.8, PI - 0.38, 1, 1],
  air(o, vy) {
    const up = clamp(-vy / 320, 0, 1), dn = clamp(vy / 320, 0, 1);
    return up > 0 ? mixPose(o, POSE._apex, POSE._rise, up) : mixPose(o, POSE._apex, POSE._fall, dn);
  },
  wall(o) { return setPose(o, [1, -11, 0.28, 0.12, 2.3, 0.5, 0.45, 0.75, 0.95, 1.6, 0.55, 1.4, PI - 0.9, 0.2, 1]); },
  roll(o) { return setPose(o, [0, -7, 0.95, 0.6, 1.5, 1.3, 1.3, 1.3, 1.95, 2.6, 1.75, 2.5, 0.65, 0, 0]); },
  attack(o, u, aL, side, air) {
    // u 0..1 through the swing; the blade winds back, cuts through the aim, and follows through
    let sw;
    if (u < 0.12) sw = -side * (1.85 + 0.35 * (u / 0.12));
    else if (u < 0.45) sw = -side * 2.2 + side * 3.75 * easeOut((u - 0.12) / 0.33);
    else sw = side * 1.55 + side * 0.22 * ((u - 0.45) / 0.55);
    let blade = aL + sw;
    if (!air) { const d = angDiff(0, blade); if (d > 0.55 && d < PI - 0.55) blade = d < PI / 2 ? 0.55 : PI - 0.55; } // keep the steel out of the floor
    const up = -Math.sin(aL), fwd = Math.cos(aL);
    const reach = u > 0.12 && u < 0.6 ? 0.08 : 0.5;
    return setPose(o, [fwd * 1.6, -10.4 - Math.max(0, up) * 1.2, 0.28 * fwd - 0.22 * Math.max(0, up) + 0.35 * Math.max(0, -up), -0.05 * fwd,
      armToward(blade), reach, -0.75, 0.95,
      air ? 0.75 : 0.78, air ? 1.15 : 0.45, air ? -0.35 : -0.6, air ? 0.95 : 0.3, blade, 0.45, 0]);
  },
  plunge(o) { return setPose(o, [0, -12, 0.32, 0.45, 0.05, 0.08, -0.75, 0.6, 1.25, 2.1, 0.9, 1.9, PI / 2, 0.85, 0]); },
  plungeLand(o) { return setPose(o, [0.5, -7.5, 0.55, 0.4, 0.15, 0.1, -0.9, 0.6, 1.25, 2.2, -0.4, 1.7, PI / 2 - 0.15, 0.3, 0]); },
  parry(o) { return setPose(o, [-0.6, -10.4, -0.15, -0.12, 1.5, 1.45, -0.3, 0.8, 0.45, 0.4, -0.55, 0.35, -1.35, 0.25, 0]); },
  throw(o, u, aL) {
    const aim = armToward(aL);
    const shB = u < 0.4 ? lerp(-0.4, PI + 0.5, u / 0.4) : aim;
    return setPose(o, [u < 0.4 ? -0.6 : 0.8, -10.6, u < 0.4 ? -0.18 : 0.32, 0, 0.3, 0.6, shB, u < 0.4 ? 0.9 : 0.05, 0.55, 0.45, -0.5, 0.35, 0.5, 0.3, 0]);
  },
  cast(o, aL) { // back hand flings the chain toward the aim
    return setPose(o, [0.4, -10.6, 0.15 + 0.2 * Math.cos(aL), 0, -0.4, 0.4, armToward(aL), 0.05, 0.5, 0.45, -0.45, 0.35, PI - 0.6, 0.3, 1]);
  },
  zip(o, aL) { // pulled along the chain: chain hand leads, legs trail
    const lean = clamp((PI / 2 + aL) * 0.55, -0.3, 1.0);
    return setPose(o, [0, -11, lean, -0.2, -0.85, 0.3, armToward(aL), 0.02, -0.45, 0.9, -0.9, 0.6, PI - 0.25, 1, 1]);
  },
  hurt(o) { return setPose(o, [-1, -10, -0.5, -0.4, 1.9, 0.6, 2.5, 0.4, 0.6, 1.0, -0.5, 0.9, PI + 0.9, 1, 1]); },
  kneel(o, t) {
    const b = Math.sin((t || 0) * 1.6) * 0.02;
    return setPose(o, [1, -6, 0.22 + b, 0.45, 0.9, 0.85, 0.6, 1.15, 1.5, 1.5, -0.2, 1.37, PI / 2 - 0.05, 0, 0]);
  },
  dash(o) { return setPose(o, [2, -8, 0.95, -0.45, 1.45, 0.05, -0.9, 0.5, 1.25, 0.6, -1.05, 0.25, 0.08, 1, 0]); },
  sit(o) { return setPose(o, [-1, -4, -0.38, 0.55, 0.45, 0.3, -0.3, 0.25, 1.45, 0.35, 1.3, 0.55, 0.25, 0, 0]); },
  slump(o) { return setPose(o, [-1, -3.5, -0.6, 0.9, 0.2, 0.1, -0.4, 0.1, 1.5, 0.25, 1.35, 0.4, 0.3, 0, 0]); },
  lunge(o) { return setPose(o, [2.5, -9, 0.75, -0.3, 1.55, 0.05, -0.8, 0.6, 1.0, 0.5, -0.9, 0.2, 0.02, 0.9, 0]); },
  windup(o, k) { // a rig enemy drawing back before a lunge
    return setPose(o, [-1.2 * k, -10.2, -0.2 * k, 0.1, lerp(1.2, PI - 0.6, k), 0.9, 0.3, 0.6, 0.55, 0.5, -0.6, 0.4, lerp(-0.85, PI + 0.6, k), 0.2, 0]);
  },
  aimBow(o) { return setPose(o, [0, -11, 0.02, 0, 1.5, 0.02, 1.35, 0.35, 0.3, 0.2, -0.3, 0.2, 0, 0, 0]); },
  ring(o, t) { // the herald swings his handbell overhead
    const s = Math.sin(t * 18);
    return setPose(o, [0, -11, -0.1, -0.15, PI - 0.3 + s * 0.35, 0.3, 0.6, 0.6, 0.25, 0.2, -0.25, 0.2, PI / 2, 0.2, 0]);
  },
};

// ---------- the Thirteenth's state -> pose ----------
const _tp = newPose();
function playerPose(p) {
  const o = _tp;
  let rate = 0.22;
  if (p.kneel > 0) { POSE.kneel(o, p.t); rate = 0.16; }
  else if (p.dashPose) { POSE.dash(o); rate = 0.6; }
  else if (p.rollT > 0) { POSE.roll(o); rate = 0.5; }
  else if (p.zip) { POSE.zip(o, p.face > 0 ? p.zipAng : PI - p.zipAng); rate = 0.4; }
  else if (p.plunge) { POSE.plunge(o); rate = 0.5; }
  else if (p.plungeLag > 0) { POSE.plungeLand(o); rate = 0.6; }
  else if (p.hurtT > 0) { POSE.hurt(o); rate = 0.45; }
  else if (p.atkT > 0) {
    const aL = p.face > 0 ? p.atkAng : PI - p.atkAng;
    POSE.attack(o, clamp(1 - p.atkT / p.atkDur, 0, 1), angDiff(0, aL), p.atkSide, !p.onGround);
    rate = 0.72;
  } else if (p.parryT > 0) { POSE.parry(o); rate = 0.6; }
  else if (p.throwT > 0) { POSE.throw(o, clamp(1 - p.throwT / 0.22, 0, 1), angDiff(0, p.face > 0 ? p.throwAng : PI - p.throwAng)); rate = 0.55; }
  else if (p.castT > 0) { POSE.cast(o, angDiff(0, p.face > 0 ? p.castAng : PI - p.castAng)); rate = 0.55; }
  else if (p.wall) { POSE.wall(o); rate = 0.3; }
  else if (!p.onGround) { POSE.air(o, p.vy); rate = 0.26; }
  else if (Math.abs(p.vx) > 20) { POSE.run(o, p.runPh, Math.abs(p.vx) / 168); rate = 0.38; }
  else { POSE.idle(o, p.t); rate = 0.2; }
  if (p.landT > 0 && p.onGround && !p.atkT) { // landing squash
    const k = clamp(p.landT / 0.12, 0, 1);
    o[1] += 3 * k; o[8] += 0.7 * k; o[9] += 1.4 * k; o[10] += 0.5 * k; o[11] += 1.2 * k; o[2] += 0.25 * k;
    rate = Math.max(rate, 0.5);
  }
  return rate;
}

// ---------- palettes ----------
const RIGPAL = {
  thirteenth: {
    head: 'capirote', weapon: 'sword', helm: '#27252e', helmHi: '#625e6e', helmLo: '#121016', band: '#c9973a', bandHi: '#f6dc9a', gold: '#d9a441',
    eye: '#ffb347', eyeHi: '#fff1c0', robe: '#7c1322', robeHi: '#a8222f', robeLo: '#430810', trim: '#2c0408', arm: '#1d1a22', armLo: '#110f14',
    leg: '#1a161e', legLo: '#0e0c10', boot: '#2a2630', cape: '#b01c30', capeLo: '#6e0f1c', blade: '#eef1f6', bladeLo: '#8f97a8', guard: '#d9a441', hilt: '#3b2418',
  },
  fallen: {
    head: 'capirote', broken: true, weapon: 'sword', helm: '#3a3a42', helmHi: '#6a6a74', helmLo: '#1c1c22', band: '#6a5a40', bandHi: '#9a8a68', gold: '#8a7a5a',
    eye: '#8ab8ff', eyeHi: '#e0f0ff', robe: '#58545a', robeHi: '#7a7680', robeLo: '#34303a', trim: '#1e1a20', arm: '#2a282e', armLo: '#18161c',
    leg: '#222026', legLo: '#141218', boot: '#34323a', cape: '#4a4652', capeLo: '#2e2a34', blade: '#c8d0dc', bladeLo: '#6a7280', guard: '#8a7a5a', hilt: '#2a1a12',
  },
  first: {
    head: 'capirote', weapon: 'sword', helm: '#b8902e', helmHi: '#f6dc9a', helmLo: '#6a4a14', band: '#7a1018', bandHi: '#c0202a', gold: '#f2d48f',
    eye: '#ff3a2a', eyeHi: '#ffd0c0', robe: '#d8ccb0', robeHi: '#f2e8d0', robeLo: '#9a8e74', trim: '#7a1018', arm: '#3a3028', armLo: '#241c16',
    leg: '#2e2620', legLo: '#1c1612', boot: '#4a3a2a', cape: '#e8dcc0', capeLo: '#a89a7c', blade: '#fff4dc', bladeLo: '#b8a070', guard: '#f2d48f', hilt: '#5a1a14',
  },
  confessor: {
    head: 'veil', weapon: 'hand', helm: '#0e0c12', helmHi: '#2a2632', helmLo: '#060508', band: '#e8e0d0', bandHi: '#ffffff', gold: '#d9a441',
    eye: '#ffd27a', eyeHi: '#fff8e0', robe: '#16121a', robeHi: '#2c2634', robeLo: '#09070c', trim: '#c9973a', arm: '#120e16', armLo: '#09070c',
    leg: '#120e16', legLo: '#09070c', boot: '#1a161e', cape: '#0e0c12', capeLo: '#060508', blade: '#f2d48f', bladeLo: '#8a6a2a', guard: '#f6dc9a', hilt: '#d9a441', skin: '#d8c4b4',
  },
  inquisitor: {
    head: 'hat', weapon: 'crossbow', helm: '#141014', helmHi: '#3a3036', helmLo: '#08060a', band: '#8a1a1a', bandHi: '#c0303a', gold: '#a8823a',
    eye: '#ff3a2a', eyeHi: '#ffc0b0', robe: '#2e1c14', robeHi: '#4e3220', robeLo: '#180e0a', trim: '#8a6a3a', arm: '#22160e', armLo: '#140c08',
    leg: '#1a120c', legLo: '#100a06', boot: '#2a1c12', cape: '#3a2418', capeLo: '#22140c', blade: '#9aa0aa', bladeLo: '#5a5e68', guard: '#a8823a', hilt: '#3a2014', skin: '#c8a890',
  },
  herald: {
    head: 'mitre', weapon: 'handbell', helm: '#e8e0cc', helmHi: '#ffffff', helmLo: '#a89c84', band: '#c9973a', bandHi: '#f6dc9a', gold: '#d9a441',
    eye: '#ff3a2a', eyeHi: '#ffd0c0', robe: '#d4cab4', robeHi: '#f0e8d4', robeLo: '#968a72', trim: '#8a1520', arm: '#c4b8a0', armLo: '#8a7e66',
    leg: '#3a3228', legLo: '#241e18', boot: '#4a3e30', cape: '#8a1520', capeLo: '#5a0e14', blade: '#c8923a', bladeLo: '#7a5420', guard: '#e8b85a', hilt: '#5a3a1a', skin: '#d0b8a0',
  },
};

// ---------- drawing ----------
const _J = {};
function rigJoints(P, s, rot) {
  const J = _J;
  const t = P[2], st = Math.sin(t), ct = Math.cos(t);
  J.hx = P[0] * s; J.hy = P[1] * s;
  J.nx = J.hx + st * 8 * s; J.ny = J.hy - ct * 8 * s;          // neck
  J.sux = st; J.suy = -ct; J.pfx = ct; J.pfy = st;             // spine up, perpendicular forward
  J.sFx = J.nx + ct * 1 * s; J.sFy = J.ny + st * 1 * s + 1 * s;
  J.sBx = J.nx - ct * 1 * s; J.sBy = J.ny - st * 1 * s + 1 * s;
  const aF = P[4], eF = aF + P[5], aB = P[6], eB = aB + P[7];
  J.eFx = J.sFx + Math.sin(aF) * 5 * s; J.eFy = J.sFy + Math.cos(aF) * 5 * s;
  J.hFx = J.eFx + Math.sin(eF) * 5 * s; J.hFy = J.eFy + Math.cos(eF) * 5 * s;
  J.eBx = J.sBx + Math.sin(aB) * 5 * s; J.eBy = J.sBy + Math.cos(aB) * 5 * s;
  J.hBx = J.eBx + Math.sin(eB) * 5 * s; J.hBy = J.eBy + Math.cos(eB) * 5 * s;
  const tF = P[8], sF = tF - P[9], tB = P[10], sB = tB - P[11];
  J.kFx = J.hx + 1 * s + Math.sin(tF) * 5 * s; J.kFy = J.hy + Math.cos(tF) * 5 * s;
  J.fFx = J.kFx + Math.sin(sF) * 6 * s; J.fFy = J.kFy + Math.cos(sF) * 6 * s;
  J.kBx = J.hx - 1 * s + Math.sin(tB) * 5 * s; J.kBy = J.hy + Math.cos(tB) * 5 * s;
  J.fBx = J.kBx + Math.sin(sB) * 6 * s; J.fBy = J.kBy + Math.cos(sB) * 6 * s;
  if (!rot) { if (J.fFy > 0.5) J.fFy = 0.5; if (J.fBy > 0.5) J.fBy = 0.5; }
  J.wa = P[12];
  if (rot) { // tumbling: spin every joint about the body's centre
    const cx = 0, cy = -7 * s, c = Math.cos(rot), sn = Math.sin(rot);
    for (const [kx, ky] of [['hx', 'hy'], ['nx', 'ny'], ['sFx', 'sFy'], ['sBx', 'sBy'], ['eFx', 'eFy'], ['hFx', 'hFy'], ['eBx', 'eBy'], ['hBx', 'hBy'], ['kFx', 'kFy'], ['fFx', 'fFy'], ['kBx', 'kBy'], ['fBx', 'fBy']]) {
      const x = J[kx] - cx, y = J[ky] - cy;
      J[kx] = cx + x * c - y * sn; J[ky] = cy + x * sn + y * c;
    }
    const ux = J.sux * c - J.suy * sn, uy = J.sux * sn + J.suy * c, px = J.pfx * c - J.pfy * sn, py = J.pfx * sn + J.pfy * c;
    J.sux = ux; J.suy = uy; J.pfx = px; J.pfy = py;
    J.wa += rot;
  }
  return J;
}
// where the cape hangs from (local, before mirroring)
function rigCapeAnchor(P, rot) {
  const J = rigJoints(P, 1, rot);
  return [J.nx - J.pfx * 2.5, J.ny - J.pfy * 2.5 + 1];
}
function drawRig(g, P, X, Y, face, pal, o = {}) {
  const s = o.s || 1, tint = o.tint || null, f = face < 0 ? -1 : 1;
  const J = rigJoints(P, s, o.rot || 0);
  const Pn = Pen.set(g, X, Y, f, tint);
  const th = Math.max(1, Math.round(2 * s));
  const out = o.out;
  // back arm + legs (behind the robe)
  Pn.c(pal.armLo).line(J.sBx, J.sBy, J.eBx, J.eBy, th).line(J.eBx, J.eBy, J.hBx, J.hBy, th);
  Pn.c(pal.legLo).line(J.hx - s, J.hy, J.kBx, J.kBy, th).line(J.kBx, J.kBy, J.fBx, J.fBy, th);
  Pn.c(pal.boot).line(J.fBx, J.fBy, J.fBx + 2 * s * (o.rot ? Math.cos(o.rot) : 1), J.fBy + (o.rot ? 2 * s * Math.sin(o.rot) : 0), Math.max(1, Math.round(s)));
  Pn.c(pal.leg).line(J.hx + s, J.hy, J.kFx, J.kFy, th).line(J.kFx, J.kFy, J.fFx, J.fFy, th);
  Pn.c(pal.boot).line(J.fFx, J.fFy, J.fFx + 2 * s * (o.rot ? Math.cos(o.rot) : 1), J.fFy + (o.rot ? 2 * s * Math.sin(o.rot) : 0), Math.max(1, Math.round(s)));
  if (P[14] > 0.5) drawRigWeapon(Pn, J, pal, s, out, X, Y, f);
  // robe
  const pfx = J.pfx, pfy = J.pfy, fl = P[13];
  const sFx = J.nx + pfx * 3.5 * s, sFy = J.ny + pfy * 3.5 * s, sBx = J.nx - pfx * 3.5 * s, sBy = J.ny - pfy * 3.5 * s;
  const wFx = J.hx + pfx * 3.2 * s, wFy = J.hy + pfy * 3.2 * s, wBx = J.hx - pfx * 3.4 * s, wBy = J.hy - pfy * 3.4 * s;
  const low = o.rot ? 0 : 1;
  const hemFx = Math.max(J.kFx, J.hx + 2 * s) + 1.5 * s, hemFy = low ? Math.max(J.kFy, J.hy + 5 * s) + s : J.kFy + s;
  const hemBx = Math.min(J.kBx, J.hx - 2 * s) - 1.5 * s - fl * 3 * s, hemBy = (low ? Math.max(J.kBy, J.hy + 5 * s) : J.kBy) + s - fl * 2.5 * s;
  const jag = Math.sin((o.t || 0) * 13) * fl * s;
  const hmx = (hemFx + hemBx) / 2, hmy = (hemFy + hemBy) / 2 + 1.5 * s + jag;
  Pn.c(pal.robe).poly([sBx, sBy, sFx, sFy, wFx, wFy, hemFx, hemFy, hmx + s, hmy - s, hmx - s, hmy + s, hemBx, hemBy, wBx, wBy]);
  Pn.c(pal.robeLo).poly([sBx, sBy, J.nx, J.ny, J.hx, J.hy, hmx - s, hmy + s, hemBx, hemBy, wBx, wBy]);
  Pn.c(pal.robeHi).line(sFx - pfx, sFy - pfy, wFx - pfx, wFy - pfy, 1);
  Pn.c(pal.trim).line(hemFx, hemFy, hmx + s, hmy - s, 1).line(hmx - s, hmy + s, hemBx, hemBy, 1);
  Pn.c(pal.gold).line(wBx, wBy - s, wFx, wFy - s, 1);
  const cxp = J.nx - J.sux * 3 * s + pfx * 1.5 * s, cyp = J.ny - J.suy * 3 * s + pfy * 1.5 * s; // gold cross on the chest
  Pn.c(pal.gold).line(cxp - J.sux * 2 * s, cyp - J.suy * 2 * s, cxp + J.sux * 1.5 * s, cyp + J.suy * 1.5 * s, 1).line(cxp - pfx * s, cyp - pfy * s, cxp + pfx * s, cyp + pfy * s, 1);
  Pn.c(pal.gold).px(wFx + pfx, wFy + s).px(wFx + pfx * 0.5, wFy + 3 * s);
  drawRigHead(Pn, J, P, pal, s, o, X, Y, f);
  // front arm + weapon
  Pn.c(pal.arm).line(J.sFx, J.sFy, J.eFx, J.eFy, th).line(J.eFx, J.eFy, J.hFx, J.hFy, th);
  if (P[14] <= 0.5) drawRigWeapon(Pn, J, pal, s, out, X, Y, f);
  if (out) { out.hbx = X + J.hBx * f; out.hby = Y + J.hBy; out.neckX = X + J.nx * f; out.neckY = Y + J.ny; }
}
function drawRigHead(Pn, J, P, pal, s, o, X, Y, f) {
  const tilt = P[3] + (o.lean || 0);
  const ux = J.sux * Math.cos(tilt) - J.suy * Math.sin(tilt), uy = J.sux * Math.sin(tilt) + J.suy * Math.cos(tilt);
  const px = -uy, py = ux; // forward perpendicular of the head
  const bx = J.nx + ux * s, by = J.ny + uy * s;
  const out = o.out;
  if (pal.head === 'capirote') {
    const H = pal.broken ? 13 : 19, back = o.drag || 0;
    const tx = bx + ux * H * s - px * back * s, ty = by + uy * H * s - py * back * s;
    const mfx = bx + ux * 5 * s + px * 3.5 * s, mfy = by + uy * 5 * s + py * 3.5 * s;
    const mbx = bx + ux * 5 * s - px * 3.5 * s, mby = by + uy * 5 * s - py * 3.5 * s;
    Pn.c(pal.helm).poly([bx - px * 3.5 * s, by - py * 3.5 * s, bx + px * 4 * s, by + py * 4 * s, mfx, mfy, tx + px * 0.6 * s, ty + py * 0.6 * s, tx - px * 0.4 * s, ty - py * 0.4 * s, mbx, mby]);
    Pn.c(pal.helmLo).poly([bx - px * 3.5 * s, by - py * 3.5 * s, bx, by, bx + ux * 8 * s, by + uy * 8 * s, tx - px * 0.4 * s, ty - py * 0.4 * s, mbx, mby]);
    Pn.c(pal.helmHi).line(mfx - px * s, mfy - py * s, lerp(mfx, tx, 0.65), lerp(mfy, ty, 0.65), 1);
    if (pal.broken) { Pn.c(pal.helmLo).px(tx + px * s, ty + py * s).px(tx - px * 1.5 * s, ty - py * 1.5 * s + s); }
    Pn.c(pal.band).line(mbx - px * 0.5 * s, mby - py * 0.5 * s, mfx + px * 0.5 * s, mfy + py * 0.5 * s, Math.max(1, Math.round(s)));
    Pn.c(pal.bandHi);
    for (let i = -3; i <= 3; i += 2) Pn.px(bx + ux * 6 * s + px * i * s + ux * ((i + 3) % 4 === 0 ? 1 : 0) * s, by + uy * 6 * s + py * i * s + uy * ((i + 3) % 4 === 0 ? 1 : 0) * s);
    const ex = bx + ux * 2.5 * s + px * 1.6 * s, ey = by + uy * 2.5 * s + py * 1.6 * s;
    Pn.c('#0b0709').line(ex - px * 0.5 * s, ey - py * 0.5 * s, ex + px * 2.6 * s, ey + py * 2.6 * s, Math.max(1, Math.round(s * 1.5)));
    Pn.c(pal.eye).line(ex, ey, ex + px * 2 * s, ey + py * 2 * s, Math.max(1, Math.round(s)));
    Pn.c(pal.eyeHi).px(ex + px * 2 * s, ey + py * 2 * s);
    if (out) { out.eyeX = X + (ex + px * 2 * s) * f; out.eyeY = Y + ey + py * 2 * s; }
  } else if (pal.head === 'veil') {
    // a long dark veil over a face you never quite see; two points of gold for eyes
    const hx = bx + ux * 3.5 * s, hy = by + uy * 3.5 * s;
    const P = (u, q) => [hx + ux * u * s + px * q * s, hy + uy * u * s + py * q * s];
    Pn.c(pal.helm).poly([...P(5.5, -1), ...P(4, 2.5), ...P(2.5, 4.2), ...P(-1.5, 4.4), ...P(-6, 2.5), ...P(-11, -2.5), ...P(-9, -7.5), ...P(1, -5)]);
    Pn.c(pal.helmLo).poly([...P(4.2, 1.6), ...P(2.4, 3.9), ...P(-1.2, 4.1), ...P(-1.6, 1.2), ...P(1.2, 0.4)]);
    const sk = P(1.0, 2.6);
    Pn.c(pal.skin || '#d8c4b4').circ(sk[0], sk[1], Math.max(1, Math.round(1.1 * s)));
    Pn.c(pal.helmLo).line(...P(2.6, 1.2), ...P(2.6, 4.2), Math.max(1, Math.round(s * 0.8)));
    Pn.c(pal.helmHi).line(...P(4.8, -0.6), ...P(-8.5, -5.5), 1).line(...P(-2, 4.3), ...P(-5.6, 2.8), 1);
    Pn.c(pal.band).line(...P(-3.2, -1.5), ...P(-2.4, 3.6), Math.max(1, Math.round(s * 0.9)));
    const e1 = P(1.9, 3.1), e2 = P(1.9, 1.5), es = Math.max(1, Math.round(s * 0.55));
    Pn.c(pal.eye).rect(Math.round(e1[0]), Math.round(e1[1]), es, es).rect(Math.round(e2[0]), Math.round(e2[1]), es, es);
    if (out) { out.eyeX = X + e1[0] * f; out.eyeY = Y + e1[1]; }
  } else if (pal.head === 'hat') {
    const hx = bx + ux * 3 * s, hy = by + uy * 3 * s;
    Pn.c(pal.skin || '#c8a890').circ(hx + px * 0.5 * s, hy + py * 0.5 * s, Math.max(1, Math.round(2.5 * s)));
    Pn.c(pal.helm).line(hx + ux * 2 * s - px * 6 * s, hy + uy * 2 * s - py * 6 * s, hx + ux * 2 * s + px * 7 * s, hy + uy * 2 * s + py * 7 * s, Math.max(1, Math.round(s * 1.5)));
    Pn.poly([hx + ux * 2 * s - px * 3 * s, hy + uy * 2 * s - py * 3 * s, hx + ux * 2 * s + px * 3 * s, hy + uy * 2 * s + py * 3 * s, hx + ux * 7 * s + px * 2.5 * s, hy + uy * 7 * s + py * 2.5 * s, hx + ux * 7 * s - px * 2.5 * s, hy + uy * 7 * s - py * 2.5 * s]);
    Pn.c(pal.band).line(hx + ux * 3 * s - px * 3 * s, hy + uy * 3 * s - py * 3 * s, hx + ux * 3 * s + px * 3 * s, hy + uy * 3 * s + py * 3 * s, 1);
    const ex = hx + px * 1.6 * s, ey = hy + py * 1.6 * s + uy * 0.5;
    Pn.c(pal.eye).px(ex, ey);
    if (out) { out.eyeX = X + ex * f; out.eyeY = Y + ey; }
  } else if (pal.head === 'mitre') {
    const hx = bx + ux * 3 * s, hy = by + uy * 3 * s;
    Pn.c(pal.skin || '#d0b8a0').circ(hx + px * 0.5 * s, hy + py * 0.5 * s, Math.max(1, Math.round(2.5 * s)));
    Pn.c(pal.helm).poly([hx + ux * 2 * s - px * 3 * s, hy + uy * 2 * s - py * 3 * s, hx + ux * 2 * s + px * 3 * s, hy + uy * 2 * s + py * 3 * s, hx + ux * 9 * s + px * 1.5 * s, hy + uy * 9 * s + py * 1.5 * s, hx + ux * 11 * s, hy + uy * 11 * s, hx + ux * 9 * s - px * 1.5 * s, hy + uy * 9 * s - py * 1.5 * s]);
    Pn.c(pal.band).line(hx + ux * 2 * s, hy + uy * 2 * s, hx + ux * 10 * s, hy + uy * 10 * s, 1).line(hx + ux * 3 * s - px * 3 * s, hy + uy * 3 * s - py * 3 * s, hx + ux * 3 * s + px * 3 * s, hy + uy * 3 * s + py * 3 * s, 1);
    const ex = hx + px * 1.6 * s, ey = hy + py * 1.6 * s;
    Pn.c(pal.eye).px(ex, ey);
    if (out) { out.eyeX = X + ex * f; out.eyeY = Y + ey; }
  }
}
function drawRigWeapon(Pn, J, pal, s, out, X, Y, f) {
  const a = J.wa, dx = Math.cos(a), dy = Math.sin(a), hx = J.hFx, hy = J.hFy;
  const w = pal.weapon;
  if (w === 'sword') {
    const bx0 = hx + dx * 2 * s, by0 = hy + dy * 2 * s, bx1 = hx + dx * 19 * s, by1 = hy + dy * 19 * s;
    Pn.c(pal.bladeLo).line(bx0 + 0.5, by0 + 0.5, bx1 + 0.5, by1 + 0.5, Math.max(1, Math.round(s)));
    Pn.c(pal.blade).line(bx0, by0, bx1, by1, Math.max(1, Math.round(s)));
    Pn.c(pal.guard).line(hx + dx * 2 * s - dy * 2 * s, hy + dy * 2 * s + dx * 2 * s, hx + dx * 2 * s + dy * 2 * s, hy + dy * 2 * s - dx * 2 * s, Math.max(1, Math.round(s)));
    Pn.c(pal.hilt).line(hx - dx * 2 * s, hy - dy * 2 * s, hx, hy, Math.max(1, Math.round(s)));
    if (out) { out.tipX = X + bx1 * f; out.tipY = Y + by1; out.hiltX = X + bx0 * f; out.hiltY = Y + by0; }
  } else if (w === 'hand') { // the Confessor's minute hand
    const L = 30 * s;
    const bx1 = hx + dx * L, by1 = hy + dy * L;
    Pn.c(pal.bladeLo).line(hx - dx * 6 * s + 0.5, hy - dy * 6 * s + 0.5, bx1 + 0.5, by1 + 0.5, Math.max(1, Math.round(s * 1.5)));
    Pn.c(pal.blade).line(hx - dx * 6 * s, hy - dy * 6 * s, bx1, by1, Math.max(1, Math.round(s * 1.2)));
    Pn.c(pal.guard).poly([bx1 + dx * 7 * s, by1 + dy * 7 * s, bx1 - dy * 3.5 * s, by1 + dx * 3.5 * s, bx1 + dy * 3.5 * s, by1 - dx * 3.5 * s]);
    Pn.c(pal.gold).circ(hx - dx * 6 * s, hy - dy * 6 * s, Math.max(1, Math.round(2 * s)));
    if (out) { out.tipX = X + (bx1 + dx * 7 * s) * f; out.tipY = Y + by1 + dy * 7 * s; out.hiltX = X + hx * f; out.hiltY = Y + hy; }
  } else if (w === 'crossbow') {
    const bx1 = hx + dx * 9 * s, by1 = hy + dy * 9 * s;
    Pn.c(pal.hilt).line(hx - dx * 2 * s, hy - dy * 2 * s, bx1, by1, Math.max(1, Math.round(s * 1.5)));
    Pn.c(pal.blade).line(bx1 - dy * 5 * s - dx * 2 * s, by1 + dx * 5 * s - dy * 2 * s, bx1, by1, 1).line(bx1, by1, bx1 + dy * 5 * s - dx * 2 * s, by1 - dx * 5 * s - dy * 2 * s, 1);
    Pn.c('#d8d0c0').line(bx1 - dy * 5 * s - dx * 2 * s, by1 + dx * 5 * s - dy * 2 * s, hx, hy, 1).line(hx, hy, bx1 + dy * 5 * s - dx * 2 * s, by1 - dx * 5 * s - dy * 2 * s, 1);
    if (out) { out.tipX = X + bx1 * f; out.tipY = Y + by1; out.hiltX = X + hx * f; out.hiltY = Y + hy; }
  } else if (w === 'handbell') {
    Pn.c(pal.hilt).line(hx, hy, hx + dx * 3 * s, hy + dy * 3 * s, 1);
    const cx = hx + dx * 5 * s, cy = hy + dy * 5 * s;
    Pn.c(pal.blade).poly([cx - dy * 3 * s - dx * 2 * s, cy + dx * 3 * s - dy * 2 * s, cx + dy * 3 * s - dx * 2 * s, cy - dx * 3 * s - dy * 2 * s, cx + dy * 2 * s + dx * 2 * s, cy - dx * 2 * s + dy * 2 * s, cx - dy * 2 * s + dx * 2 * s, cy + dx * 2 * s + dy * 2 * s]);
    Pn.c(pal.guard).px(cx + dx * 2 * s, cy + dy * 2 * s);
    if (out) { out.tipX = X + cx * f; out.tipY = Y + cy; out.hiltX = X + hx * f; out.hiltY = Y + hy; }
  }
}
// cloth tail from the shoulders (verlet points in world space)
function drawCape(g, tail, camx, camy, pal, tint) {
  for (let i = 0; i < tail.length - 1; i++) {
    const a = tail[i], b = tail[i + 1];
    const th = i < 2 ? 3 : i < 4 ? 2 : 1;
    g.fillStyle = tint || (i < 3 ? pal.cape : pal.capeLo);
    pline(g, a.x - camx, a.y - camy, b.x - camx, b.y - camy, th);
  }
  g.fillStyle = tint || pal.capeLo;
  for (let i = 1; i < tail.length - 1; i += 2) pline(g, tail[i].x - camx, tail[i].y - camy + 1, tail[i + 1].x - camx, tail[i + 1].y - camy + 1, 1);
}
// the cape's verlet step, shared by every caped figure
function updateCapeTail(a, dt, ax, ay) {
  const t = a.tail;
  t[0].x = ax; t[0].y = ay;
  if (dt <= 0) return;
  const damp = Math.pow(0.9, dt * 60);
  for (let i = 1; i < t.length; i++) {
    const q = t[i], pr = t[i - 1];
    q.vx = (q.vx + (-a.vx * 2.6 - a.face * 26 + Math.sin(a.t * 7 + i * 0.8) * 16) * dt) * damp;
    q.vy = (q.vy + (240 - a.vy * 1.4 + Math.cos(a.t * 9 + i) * 30) * dt) * damp;
    q.x += q.vx * dt; q.y += q.vy * dt;
    const dx = q.x - pr.x, dy = q.y - pr.y, d = Math.hypot(dx, dy) || 1, L = 2.6;
    if (d > L) { q.x = pr.x + (dx / d) * L; q.y = pr.y + (dy / d) * L; }
  }
}
// the Thirteenth, from a live player or an afterimage snapshot
function drawPlayerBody(g, a, X, Y, tint, out) {
  drawRig(g, a.pose, X, Y, a.face, RIGPAL.thirteenth, { tint, rot: a.rollT > 0 ? a.rollRot : 0, out, t: a.t, drag: clamp(Math.abs(a.vx) / 90, 0, 2.5) * (a.onGround ? 1 : 0.6) });
}
