/**
 * NIGHT LOOK: every value that shapes the night in one place. Colours are sRGB hex (as a colour picker
 * shows them); intensities are linear light, before exposure and tone mapping.
 *
 * Tune live in the browser console with the debug build (`?debug`): `nm.night` is this object, and
 * `nm.applyNight()` pushes changes to the sky, fog, lights and grade. Values marked (reload) are
 * compiled into shaders and need a page reload.
 *
 * The scene is lit for night rather than darkened: a low cold moon (baked outdoors, a real-time beam
 * indoors), a navy sky fill that keeps shadows readable, and warm practical lights (windows, lanterns,
 * the street lamp, screens) as the focal points.
 */
export const NIGHT = {
  /** Direction towards the moon in game space (x east, y up, z south). Matches the baked moonlight. (reload) */
  moonDirection: [0.55, 0.5, 0.62] as [number, number, number],

  sky: {
    /** Straight up: almost black, a hint of navy. */
    zenith: '#020308',
    /** Band above the horizon: deep blue going purple. */
    horizon: '#1b2342',
    /** Right at the horizon, where the haze is thickest (and what the fog fades to). */
    haze: '#2a3150',
    /** A faint warm glow over the town (towards the road), low on the horizon. */
    townGlow: '#4a3228',
    /** Compass direction of the town glow in degrees (0 = north / -z, 90 = east / +x). */
    townGlowAzimuth: 200,
    townGlowStrength: 0.35,
    /** Overall sky brightness (linear multiplier). */
    brightness: 1,
    stars: {
      /** Star count: grid cells per radian of sky (more = denser and smaller). */
      density: 200,
      brightness: 1.6,
      /** 0 = steady, 1 = strong scintillation. */
      twinkle: 0.55,
      /** The faint band of the Milky Way. */
      milkyWay: 0.35,
    },
    moon: {
      /** Apparent radius in degrees (the real moon is 0.26; a little bigger reads better on screen). */
      radiusDeg: 1.5,
      color: '#e6ecff',
      /** Disc brightness: above the bloom threshold so it glows, low enough that its seas still show. */
      intensity: 2.6,
      /** Tight glow around the disc and the wide halo it throws on the haze. */
      glowColor: '#7d93d6',
      glow: 0.55,
      halo: 0.2,
      /** The 22-degree ice-crystal ring of a cold night. */
      ring: 0.018,
    },
    clouds: {
      /** 0 = clear, 1 = overcast. */
      coverage: 0.42,
      /** Drift in sky units per second along x and z. */
      speed: [0.0045, 0.0018] as [number, number],
      scale: 1.6,
      /** Cloud colour away from the moon, and their moonlit edges near it. */
      shadow: '#0d1222',
      lit: '#8c9ccc',
      opacity: 0.9,
    },
  },

  /** Height fog outdoors: thick near the snow and the lake, thinning with height. */
  fog: {
    /** Fog colour; the sky's haze band uses it too, so distant silhouettes melt into the horizon. */
    color: '#1b2440',
    /** Density at ground level, per metre. */
    density: 0.017,
    /** Height of the ground fog's base (game y) and how fast it thins upwards (per metre). (reload) */
    baseHeight: -1.4,
    falloff: 0.085,
    /** Moonlight scattered in the haze when looking towards the moon. (reload) */
    moonScatter: '#44558a',
    moonScatterPower: 6,
  },

  /** Exposure per lighting state; `on` = house lights on, `moon` = lights off. */
  exposure: {
    exteriorOn: 1.35,
    exteriorMoon: 1.5,
    /** Moonlit rooms: multiplier on each room's own moon exposure (they used to be pushed to daylight). */
    interiorMoonScale: 0.72,
  },

  /** Colour of the baked moonlight inside (linear RGB multiplier): cold, but not a blue filter. */
  interiorMoonTint: [0.86, 0.9, 1.0] as [number, number, number],

  /** The moon indoors: a real-time light through the windows (the bake only has a soft window glow). */
  moonBeam: {
    color: '#a9bcff',
    intensity: 2.2,
    /** Visible shafts in the air and the dust drifting in them. */
    shaftOpacity: 0.1,
    shaftLength: 4.5,
    dust: 260,
    shadowMapSize: 2048,
  },

  /** Warm practical lights outdoors: the street lamp and the house's lanterns. */
  practicals: {
    lampColor: '#ffc67a',
    /** Glow sprite around each bulb (size in metres, brightness). */
    haloSize: 1.5,
    haloIntensity: 1.1,
    /** The street lamp's cone of light in the snowy air. */
    coneOpacity: 0.07,
    /** Noise-driven flicker: depth (0..1) and speed. The street lamp is old; the lanterns barely move. */
    streetLampFlicker: 0.18,
    lanternFlicker: 0.04,
    flickerSpeed: 6,
    /** Warm pools the lit windows throw on the snow. */
    windowPool: '#ffb466',
    windowPoolIntensity: 0.85,
  },

  /** Low mist drifting over the snow and the lake. */
  mist: {
    color: '#5a6a96',
    opacity: 0.3,
    height: 1.1,
    speed: 0.25,
  },

  /** Wind in the pines. */
  wind: {
    /** Sway at the tree tops in metres per 10 m of height. */
    sway: 0.07,
    speed: 0.55,
  },

  /** Falling snow. */
  snowfall: {
    count: 6000,
    /** Flake size in pixels at 10 m. */
    size: 3.2,
    /** How much brighter flakes get inside a lamp's light. */
    lampBoost: 9,
  },

  /** The snow on the ground. */
  snow: {
    /** Glints that catch the moon and lamps. */
    sparkle: 0.9,
    /** Large-scale brightness and roughness variation (kills visible tiling). */
    variation: 0.22,
  },

  /** Colour grade after tone mapping. */
  grade: {
    /** 'aces' (punchier, deeper blacks) or 'agx' (softer). */
    toneMapping: 'aces' as 'aces' | 'agx',
    /** Cool shadows, warm highlights: tints added in the darks and the brights. */
    shadowTint: '#2a3a55',
    highlightTint: '#ffd6a0',
    splitStrength: 0.07,
    /** -1..1; night vision is less colourful. */
    saturation: -0.22,
    /** Contrast around a low pivot (night pictures live in the lower half of the range). */
    contrast: 1.12,
    pivot: 0.3,
    /** The darkest the screen gets (0..1 in display values), so silhouettes stay readable. */
    blackLevel: 0.018,
  },

  bloom: {
    /** Only lights and glowing surfaces pass the threshold. */
    threshold: 0.82,
    intensity: 0.75,
    smoothing: 0.22,
    radius: 0.78,
  },

  lens: {
    vignette: 0.6,
    grain: 0.1,
  },
};

export type NightConfig = typeof NIGHT;
