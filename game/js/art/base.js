/* ART — registre et helpers de dessin partagés par tous les personnages et ennemis.
   Contrat : voir game/DESIGN.md, section 5. Ne pas modifier la signature des helpers. */
(function () {
  const ART = {
    OUT: '#1c1420',
    chars: {},

    register(ch) {
      this.chars[ch.id] = ch;
      return ch;
    },

    get(id) {
      return this.chars[id] || null;
    },

    /* Dessine le personnage `id` avec la pose `pose`, pieds en (0,0), face à droite par défaut. */
    draw(ctx, id, pose) {
      const c = this.chars[id];
      const p = pose || {};
      ctx.save();
      if (p.facing === -1) ctx.scale(-1, 1);
      try {
        if (c && typeof c.draw === 'function') c.draw(ctx, p);
        else placeholder(ctx, c ? c.w : 24, c ? c.h : 40);
      } catch (e) {
        // Un dessin défectueux ne doit jamais faire planter le jeu.
        placeholder(ctx, 24, 40);
      }
      ctx.restore();
    },

    /* Dessine le portrait (buste 200x200 centré sur 0,0) pour la boîte de dialogue. */
    portrait(ctx, id, expr, t) {
      const c = this.chars[id];
      ctx.save();
      try {
        if (c && typeof c.portrait === 'function') c.portrait(ctx, expr || 'neutral', t || 0);
        else placeholderPortrait(ctx);
      } catch (e) {
        placeholderPortrait(ctx);
      }
      ctx.restore();
    },

    /* ---------- helpers ---------- */

    limb(ctx, x1, y1, x2, y2, width, color, opts) {
      const o = opts || {};
      ctx.save();
      ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      ctx.lineCap = 'round';
      if (o.stroke !== false) {
        ctx.strokeStyle = o.outline || ART.OUT;
        ctx.lineWidth = width + (o.lw == null ? 2 : o.lw) * 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    },

    ell(ctx, x, y, rx, ry, color, opts) {
      const o = opts || {};
      ctx.save();
      ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      ctx.translate(x, y);
      ctx.rotate(o.rot || 0);
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (o.stroke !== false) {
        ctx.strokeStyle = o.outline || ART.OUT;
        ctx.lineWidth = o.lw == null ? 2 : o.lw;
        ctx.stroke();
      }
      ctx.restore();
    },

    rr(ctx, x, y, w, h, r, color, opts) {
      const o = opts || {};
      ctx.save();
      ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(o.rot || 0);
      const rw = w / 2, rh = h / 2;
      const rad = Math.max(0, Math.min(r, rw, rh));
      ctx.beginPath();
      ctx.moveTo(-rw + rad, -rh);
      ctx.arcTo(rw, -rh, rw, rh, rad);
      ctx.arcTo(rw, rh, -rw, rh, rad);
      ctx.arcTo(-rw, rh, -rw, -rh, rad);
      ctx.arcTo(-rw, -rh, rw, -rh, rad);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      if (o.stroke !== false) {
        ctx.strokeStyle = o.outline || ART.OUT;
        ctx.lineWidth = o.lw == null ? 2 : o.lw;
        ctx.stroke();
      }
      ctx.restore();
    },

    poly(ctx, pts, color, opts) {
      const o = opts || {};
      if (!pts || pts.length < 3) return;
      ctx.save();
      ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      if (o.stroke !== false) {
        ctx.strokeStyle = o.outline || ART.OUT;
        ctx.lineWidth = o.lw == null ? 2 : o.lw;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      ctx.restore();
    },

    gear(ctx, x, y, r, teeth, rot, color, opts) {
      const o = opts || {};
      const n = Math.max(3, teeth | 0);
      const inner = r * 0.78;
      ctx.save();
      ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      ctx.translate(x, y);
      ctx.rotate(rot || 0);
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a0 = (i / (n * 2)) * Math.PI * 2;
        const a1 = ((i + 0.5) / (n * 2)) * Math.PI * 2;
        const rr = i % 2 === 0 ? r : inner;
        if (i === 0) ctx.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
        else ctx.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
        ctx.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      if (o.stroke !== false) {
        ctx.strokeStyle = o.outline || ART.OUT;
        ctx.lineWidth = o.lw == null ? 2 : o.lw;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      // moyeu
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = ART.shade(color, -0.35);
      ctx.fill();
      ctx.restore();
    },

    /* Œil : blanc + pupille. blink 0 (ouvert) .. 1 (fermé). lookX/lookY : direction de regard (-1..1). */
    eye(ctx, x, y, r, lookX, lookY, blink, opts) {
      const o = opts || {};
      const b = ART.clamp(blink || 0, 0, 1);
      const ry = Math.max(0.6, r * (1 - b));
      ctx.save();
      ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      ctx.beginPath();
      ctx.ellipse(x, y, r, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = o.white || '#f6efe1';
      ctx.fill();
      ctx.strokeStyle = o.outline || ART.OUT;
      ctx.lineWidth = o.lw == null ? 1.5 : o.lw;
      ctx.stroke();
      if (b < 0.8) {
        const pr = r * 0.5;
        const px = x + ART.clamp(lookX || 0, -1, 1) * r * 0.35;
        const py = y + ART.clamp(lookY || 0, -1, 1) * r * 0.25;
        ctx.beginPath();
        ctx.ellipse(px, py, pr, Math.min(pr, ry), 0, 0, Math.PI * 2);
        ctx.fillStyle = o.pupil || '#20181f';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px - pr * 0.3, py - pr * 0.35, pr * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      ctx.restore();
    },

    /* Éclaircit (amt > 0) ou assombrit (amt < 0) une couleur '#rrggbb'. amt dans [-1, 1]. */
    shade(hex, amt) {
      const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
      if (!m) return hex;
      const n = parseInt(m[1], 16);
      let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      const f = ART.clamp(amt || 0, -1, 1);
      const t = f < 0 ? 0 : 255;
      const k = Math.abs(f);
      r = Math.round(r + (t - r) * k);
      g = Math.round(g + (t - g) * k);
      b = Math.round(b + (t - b) * k);
      return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
    },

    lerp(a, b, t) {
      return a + (b - a) * t;
    },

    clamp(v, a, b) {
      return v < a ? a : v > b ? b : v;
    },
  };

  function placeholder(ctx, w, h) {
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(-w / 2, -h, w, h);
  }

  function placeholderPortrait(ctx) {
    ctx.fillStyle = '#555';
    ctx.fillRect(-100, -100, 200, 200);
  }

  window.ART = ART;
})();
