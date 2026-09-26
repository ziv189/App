import WebGL from 'three/addons/capabilities/WebGL.js';
import './style.css';
import { errorReport } from './core/diagnostics';

// Tells the boot guard in index.html that the game code arrived and is running.
window.sosiesBooted = true;

function showFatal(message: string): void {
  document.getElementById('screen-loading')!.hidden = true;
  document.getElementById('screen-error')!.hidden = false;
  document.getElementById('error-text')!.textContent = errorReport(message);
}

/** The physics engine and geometry decoder are WebAssembly; some locked-down pages forbid it. */
function webAssemblyAllowed(): boolean {
  try {
    return new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])) instanceof WebAssembly.Module;
  } catch {
    return false;
  }
}

async function boot(): Promise<void> {
  if (!webAssemblyAllowed()) {
    showFatal(
      'This page is not allowed to run WebAssembly, which the game needs for physics.\n\n' +
        'Run the game from your own computer instead (double-click START-SOSIES.bat), or tell me where you opened it.',
    );
    return;
  }
  if (!WebGL.isWebGL2Available()) {
    showFatal(
      'SOSIES needs WebGL 2, which this browser could not start.\n\n' +
        '1. Use an up-to-date Chrome, Edge or Firefox.\n' +
        '2. In the browser settings, turn on "Use graphics acceleration when available".\n' +
        '3. Update your graphics card driver, then restart the browser.',
    );
    return;
  }
  document.getElementById('loading-status')!.textContent = 'Loading engine';
  // The engine (three.js, physics, post-processing) is a separate download so this screen shows at once.
  const [{ Game }, { techTest }] = await Promise.all([import('./core/Game'), import('./levels/techTest')]);
  const game = new Game(document.getElementById('view') as HTMLCanvasElement);
  // Handy from the browser console while developing (e.g. `sosies.player.position`).
  if (import.meta.env.DEV) (window as unknown as { sosies: typeof game }).sosies = game;
  await game.start(techTest);
}

boot().catch((err: unknown) => {
  console.error(err);
  showFatal(`The game failed to start:\n${err instanceof Error ? err.message : String(err)}`);
});
