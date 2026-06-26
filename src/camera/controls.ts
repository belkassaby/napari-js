import type { Camera } from './camera';

/** Wheel-zoom sensitivity: zoom multiplier per (normalized, clamped) wheel-delta unit, applied as
 *  exp(-delta * speed). Tuned for a gentle, smooth zoom across mice and trackpads. */
const WHEEL_ZOOM_SPEED = 0.002;

/**
 * Attach pointer-drag panning and wheel zoom (zoom about the cursor) to a canvas. Returns a
 * detach function. World/screen conversion uses the camera's current center+zoom and the
 * canvas's CSS size (Y flipped to match {@link ortho2d}).
 */
export function attachCameraControls(canvas: HTMLCanvasElement, camera: Camera): () => void {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onPointerDown = (e: PointerEvent): void => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!dragging) return;
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
    dragging = false;
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    // Cursor in CSS pixels relative to canvas center.
    const px = e.clientX - rect.left - rect.width / 2;
    const py = e.clientY - rect.top - rect.height / 2;
    const { zoom } = camera;
    const [cx, cy] = camera.center;
    // World point under the cursor before zoom.
    const wx = cx + px / zoom;
    const wy = cy + py / zoom;
    // Normalize the wheel delta across devices (line/page deltaMode) and clamp per event so a
    // high-resolution mouse wheel or trackpad momentum zooms smoothly instead of in large jumps.
    let delta = e.deltaY;
    if (e.deltaMode === 1)
      delta *= 16; // lines → ~px
    else if (e.deltaMode === 2) delta *= rect.height || 800; // pages → ~px
    delta = Math.max(-40, Math.min(40, delta));
    const factor = Math.exp(-delta * WHEEL_ZOOM_SPEED);
    const newZoom = zoom * factor;
    // Keep that world point under the cursor after zoom.
    camera.set([wx - px / newZoom, wy - py / newZoom], newZoom);
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('wheel', onWheel);
  };
}
