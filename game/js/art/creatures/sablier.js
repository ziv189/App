/* Creature: sablier, a flying hourglass with paper wings that feeds on lost moments.
   Facing right; origin (0,0) = bottom of the glass, hitbox 26 x 34. Plain browser script, registered with ART. */
(function () {
  const P = {
    brass: '#c9963f', brassHi: '#f0d78f', brassDark: '#7a5222',
    glass: 'rgba(200,235,255,0.38)', glassHi: 'rgba(255,255,255,0.9)',
    sand: '#e8a13a', sandHi: '#ffd27a',
    paper: '#f4efe6', paperDark: '#cdbfa6', ink: '#3a3a44',
  };
  const TOP = -29.5, WAIST = -17.2, BOT = -4.5; // glass extent along y
  const HINGE_Y = -19;                          // wings join the glass here

  // Wing flap per state: [base angle above horizontal, amplitude, speed]. Angles in radians.
  const FLAP = {
    idle: [0.6, 0.45, 9],
    walk: [0.6, 0.5, 13],
    attack: [0.25, 0.05, 30],   // wings tucked back along the body
    hurt: [0.8, 0.4, 28],
    dead: [-0.15, 0, 0],        // wings stopped, hanging limp
  };

  // Both bulbs as one closed path, joined at the waist.
  function glassPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(-7, TOP);
    ctx.bezierCurveTo(-7, -23, -1.2, -20.5, -1, WAIST);
    ctx.bezierCurveTo(-1.2, -14, -7, -11, -7, BOT);
    ctx.lineTo(7, BOT);
    ctx.bezierCurveTo(7, -11, 1.2, -14, 1, WAIST);
    ctx.bezierCurveTo(1.2, -20.5, 7, -23, 7, TOP);
    ctx.closePath();
  }

  function grain(ctx, x, y, r, a) {
    ctx.save();
    ctx.globalAlpha *= ART.clamp(a, 0, 1);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = P.sandHi;
    ctx.fill();
    ctx.restore();
  }

  // Faint trail of grains falling behind the flight path.
  function trail(ctx, tm) {
    for (let i = 0; i < 5; i++) {
      const s = ((tm * 0.9 + i / 5) % 1 + 1) % 1;
      grain(ctx, -4 - s * 12 + Math.sin(tm * 3 + i) * 0.8, -15 + s * s * 15, 0.9, (1 - s) * 0.6);
    }
  }

  // Speed streaks behind the body during the dive.
  function streaks(ctx, k) {
    ctx.save();
    ctx.globalAlpha *= 0.55 * ART.clamp(k, 0, 1);
    ctx.strokeStyle = P.sandHi;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, -24); ctx.lineTo(-22, -28);
    ctx.moveTo(-10, -17); ctx.lineTo(-24, -17);
    ctx.moveTo(-12, -10); ctx.lineTo(-21, -6);
    ctx.stroke();
    ctx.restore();
  }

  // One paper wing: root (rx, ry), angle a above horizontal pointing back, length len.
  function wing(ctx, rx, ry, a, len, fill) {
    const dx = -Math.cos(a), dy = -Math.sin(a); // points back and up
    const nx = -dy, ny = dx;                    // leading edge side (up and forward)
    const at = (s, o) => [rx + dx * len * s + nx * len * o, ry + dy * len * s + ny * len * o];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    let c = at(0.5, 0.2), e = at(1, 0);
    ctx.quadraticCurveTo(c[0], c[1], e[0], e[1]);          // leading edge
    c = at(0.84, -0.2); e = at(0.66, -0.12);
    ctx.quadraticCurveTo(c[0], c[1], e[0], e[1]);          // scalloped trailing edge
    c = at(0.5, -0.24); e = at(0.33, -0.12);
    ctx.quadraticCurveTo(c[0], c[1], e[0], e[1]);
    c = at(0.16, -0.2);
    ctx.quadraticCurveTo(c[0], c[1], rx, ry);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = ART.OUT;
    ctx.stroke();
    // ink veins
    ctx.beginPath();
    [[0.6, 0.07], [0.88, -0.02], [0.5, -0.1]].forEach(function (v) {
      const q = at(v[0], v[1]);
      ctx.moveTo(rx, ry);
      ctx.lineTo(q[0], q[1]);
    });
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha *= 0.85;
    ctx.stroke();
    ctx.restore();
  }

  // Glass, sand (clipped to the glass), outline, glint and the stream through the waist.
  function drawGlass(ctx, fu, tm) {
    const fl = 1 - fu;
    const lowTop = BOT - fl * 9; // surface of the sand pile in the lower bulb
    glassPath(ctx);
    ctx.fillStyle = P.glass;
    ctx.fill();
    ctx.save();
    glassPath(ctx);
    ctx.clip();
    ctx.fillStyle = P.sand;
    if (fu > 0.02) ctx.fillRect(-9, WAIST - fu * 11, 18, fu * 11 + 1); // upper sand rests on the waist
    if (fl > 0.02) {
      ctx.fillRect(-9, lowTop, 18, BOT - lowTop + 3);
      ctx.beginPath();
      ctx.ellipse(0, lowTop, 7, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    glassPath(ctx);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = ART.OUT;
    ctx.stroke();
    ctx.beginPath(); // glint on the upper bulb
    ctx.moveTo(-4.6, -26);
    ctx.quadraticCurveTo(-4.2, -22.5, -2.8, -20.2);
    ctx.strokeStyle = P.glassHi;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    if (fu > 0.02) { // stream through the waist, wobbling
      ctx.beginPath();
      ctx.moveTo(0, WAIST);
      ctx.lineTo(Math.sin(tm * 22) * 0.35, fl > 0.02 ? lowTop : BOT - 1);
      ctx.strokeStyle = P.sandHi;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // Brass caps with glints and rivets.
  function drawCaps(ctx) {
    ART.rr(ctx, -9, -33, 18, 3.5, 1.2, P.brass, { lw: 1.4 });
    ART.rr(ctx, -9, BOT, 18, 3.5, 1.2, P.brass, { lw: 1.4 });
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-6, -31.9); ctx.lineTo(4, -31.9);
    ctx.moveTo(-6, -3.6); ctx.lineTo(4, -3.6);
    ctx.strokeStyle = P.brassHi;
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    [[-6.5, -31.25], [6.5, -31.25], [-6.5, -2.75], [6.5, -2.75]].forEach(function (r) {
      ART.ell(ctx, r[0], r[1], 0.9, 0.9, P.brassDark, { lw: 0.6 });
    });
  }

  function draw(ctx, p) {
    const pose = p || {};
    const st = Object.prototype.hasOwnProperty.call(FLAP, pose.state) ? pose.state : 'idle';
    const t = Math.max(0, Number(pose.t) || 0);
    const tm = Number(pose.time) || 0;
    const f = FLAP[st];
    let dx = 0, dy = 0, tilt = 0, lenK = 1, fade = 1;
    let fu = 1 - ((tm / 7) % 1 + 1) % 1; // upper sand left: drains, then the hour turns

    switch (st) {
      case 'walk':
        dy = Math.sin(tm * 4.2) * 1.4;
        tilt = Math.sin(tm * 2.1) * 0.1;
        break;
      case 'attack':
        lenK = 0.6;
        if (t < 0.14) { tilt = -0.3 * (t / 0.14); dx = -2 * (t / 0.14); } // pull back
        else tilt = Math.min(1.2, -0.3 + (t - 0.14) * 10);               // dive nose-down
        break;
      case 'hurt': {
        const k = Math.max(0, 1 - t / 0.35);
        tilt = -0.3 * k;
        dx = -3 * k;
        break;
      }
      case 'dead':
        tilt = t * 4.2;                                  // tumbling
        dy = Math.min(t * t * 12, 16);
        fade = t > 1.5 ? Math.max(0, 1 - (t - 1.5) / 0.6) : 1;
        fu = 1 - Math.min(1, t / 1.8);                   // sand runs out
        break;
      default: // idle
        dy = Math.sin(tm * 2.2) * 1.0;
        tilt = Math.sin(tm * 1.3) * 0.05;
    }

    const wingA = function (ph) { return f[0] + f[1] * Math.sin(tm * f[2] + ph); };
    ctx.save();
    ctx.globalAlpha *= fade;
    ctx.translate(dx, dy);
    ctx.translate(0, WAIST);
    ctx.rotate(tilt);
    ctx.translate(0, -WAIST);
    if (st !== 'dead') trail(ctx, tm);
    if (st === 'attack') streaks(ctx, (t - 0.1) / 0.1);
    wing(ctx, 0, HINGE_Y, wingA(0.5), 14.5 * lenK, P.paperDark); // far wing
    wing(ctx, 0, HINGE_Y, wingA(0), 17 * lenK, P.paper);         // near wing
    drawGlass(ctx, fu, tm);
    drawCaps(ctx);
    ART.ell(ctx, 0, HINGE_Y, 1.7, 1.7, P.brassDark, { lw: 0.8 }); // wing hinge
    ctx.restore();
  }

  // Portrait stub: the creature scaled up and centred in the 200x200 box.
  function portrait(ctx, expr, t) {
    ctx.save();
    ctx.scale(4, 4);
    ctx.translate(0, 17);
    draw(ctx, { state: 'idle', time: Number(t) || 0 });
    ctx.restore();
  }

  ART.register({ id: 'sablier', w: 26, h: 34, draw: draw, portrait: portrait });
})();
