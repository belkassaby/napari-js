import type { Camera } from './camera';

/** Wheel-zoom sensitivity: zoom multiplier per (normalized, clamped) wheel-delta unit, applied as
 *  exp(-delta * speed). Deliberately gentle; override via {@link CameraControlOptions}. */
const DEFAULT_WHEEL_ZOOM_SPEED = 0.0015;
/** Per-event wheel-delta clamp (after deltaMode normalization) so one big event / momentum tick
 *  can't zoom far in a single step. */
const WHEEL_DELTA_CLAMP = 24;
/** Click-to-zoom multiplier (zoom in on a plain click; its reciprocal on a modifier/right click). */
const DEFAULT_CLICK_ZOOM_FACTOR = 2;
/** Pointer travel (CSS px) beyond which a press-release is a pan, not a click (so it won't zoom). */
const CLICK_MOVE_THRESHOLD = 4;

export interface CameraControlOptions {
  /** Wheel-zoom sensitivity (see {@link DEFAULT_WHEEL_ZOOM_SPEED}). Smaller = gentler. */
  wheelZoomSpeed?: number;
  /** Click-to-zoom step (default 2× in / 0.5× out). Set 0 to disable click-to-zoom. */
  clickZoomFactor?: number;
}

/**
 * Attach pointer-drag panning, wheel zoom, and OSD-style click-to-zoom to a canvas. Returns a
 * detach function. A plain left click zooms in about the cursor; a right click or modifier-click
 * (shift/ctrl/alt/meta) zooms out; a left drag pans (and never triggers click-zoom). World/screen
 * conversion uses the camera's current center+zoom and the canvas's CSS size.
 */
export function attachCameraControls(
  canvas: HTMLCanvasElement,
  camera: Camera,
  opts: CameraControlOptions = {},
): () => void {
  const wheelSpeed = opts.wheelZoomSpeed ?? DEFAULT_WHEEL_ZOOM_SPEED;
  const clickFactor = opts.clickZoomFactor ?? DEFAULT_CLICK_ZOOM_FACTOR;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let downX = 0;
  let downY = 0;
  let moved = false;

  /** Zoom by `factor` while keeping the world point under the cursor fixed. */
  const zoomAbout = (clientX: number, clientY: number, factor: number): void => {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left - rect.width / 2;
    const py = clientY - rect.top - rect.height / 2;
    const { zoom } = camera;
    const [cx, cy] = camera.center;
    const wx = cx + px / zoom;
    const wy = cy + py / zoom;
    const newZoom = zoom * factor;
    camera.set([wx - px / newZoom, wy - py / newZoom], newZoom);
  };

  const onPointerDown = (e: PointerEvent): void => {
    downX = e.clientX;
    downY = e.clientY;
    moved = false;
    if (e.button === 0) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    }
    canvas.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!dragging) return;
    if (!moved && Math.hypot(e.clientX - downX, e.clientY - downY) > CLICK_MOVE_THRESHOLD) {
      moved = true;
    }
    const dxPx = e.clientX - lastX;
    const dyPx = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    // Drag right → content moves right → center moves left. Y axis is flipped on screen.
    const { zoom } = camera;
    const [cx, cy] = camera.center;
    camera.center = [cx - dxPx / zoom, cy - dyPx / zoom];
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    const wasDragging = dragging;
    dragging = false;
    // A press-release that didn't pan is a click → zoom about the cursor. Right button or a
    // modifier zooms out; a plain left click zooms in. Skips when click-zoom is disabled.
    if (clickFactor > 0 && !moved && !(wasDragging && moved)) {
      const zoomOut = e.button === 2 || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey;
      zoomAbout(e.clientX, e.clientY, zoomOut ? 1 / clickFactor : clickFactor);
    }
  };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    // Normalize the wheel delta across devices (line/page deltaMode) and clamp per event so a
    // high-resolution mouse wheel or trackpad momentum zooms smoothly instead of in large jumps.
    let delta = e.deltaY;
    if (e.deltaMode === 1)
      delta *= 16; // lines → ~px
    else if (e.deltaMode === 2) delta *= canvas.getBoundingClientRect().height || 800; // pages → ~px
    delta = Math.max(-WHEEL_DELTA_CLAMP, Math.min(WHEEL_DELTA_CLAMP, delta));
    zoomAbout(e.clientX, e.clientY, Math.exp(-delta * wheelSpeed));
  };

  // Suppress the browser context menu so a right-click can zoom out.
  const onContextMenu = (e: MouseEvent): void => e.preventDefault();

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContextMenu);

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onContextMenu);
  };
}
