import { NoToneMapping, PCFShadowMap, SRGBColorSpace, WebGLRenderer } from 'three';

/**
 * WebGL 2 renderer configured for a post-processed, physically based pipeline:
 * scene renders in linear HDR, then PostFX does ambient occlusion, bloom, tone mapping, anti-aliasing
 * and the film look before converting to the screen's sRGB.
 */
export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({
    canvas,
    powerPreference: 'high-performance',
    // Anti-aliasing, depth and stencil are handled by the post-processing composer's own buffers.
    antialias: false,
    depth: false,
    stencil: false,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping; // tone mapping happens in PostFX (it still reads toneMappingExposure)
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  // The composer renders several passes per frame; we reset the stats ourselves once per frame.
  renderer.info.autoReset = false;
  return renderer;
}
