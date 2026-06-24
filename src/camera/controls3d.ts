import type { Camera3D } from './camera3d';

/**
 * Attach orbit controls to a canvas. A pointer drag does `camera.dragMode` — rotate
 * (azimuth/elevation), pan (translate the target), or zoom (dolly) — and the wheel always
 * dollies. Returns a detach function.
 */
export function attachOrbitControls(canvas: HTMLCanvasElement, camera: Camera3D): () => void {
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
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (camera.dragMode === 'pan') {
      camera.pan(dx, dy, canvas.clientHeight || canvas.height || 1);
    } else if (camera.dragMode === 'zoom') {
      camera.zoomBy(Math.exp(dy * 0.005));
    } else {
      camera.orbit(-dx * 0.01, -dy * 0.01);
    }
  };

  const onPointerUp = (e: PointerEvent): void => {
    dragging = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    camera.zoomBy(Math.exp(e.deltaY * 0.0015));
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
