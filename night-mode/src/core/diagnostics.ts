/** Describes the player's setup for bug reports (shown on error screens). */
export function environmentReport(): string {
  let graphics = 'unknown';
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) {
      graphics = 'WebGL 2 unavailable';
    } else {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      graphics = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    graphics = 'could not be read';
  }
  return [
    `Browser: ${navigator.userAgent}`,
    `Graphics: ${graphics}`,
    `Address: ${location.href}`,
    `Window: ${window.innerWidth}x${window.innerHeight} at ${window.devicePixelRatio}x scaling`,
  ].join('\n');
}

/** Error text plus setup details, ready to paste into a bug report. */
export function errorReport(message: string): string {
  return `${message}\n\n--- Details for the bug report ---\n${environmentReport()}`;
}
