export interface CameraLike {
  scrollX: number
  scrollY: number
  zoom: number
  width: number
  height: number
}

export function clampCameraScroll(
  scrollX: number,
  scrollY: number,
  camera: CameraLike,
  worldWidth: number,
  worldHeight: number,
) {
  const visibleWidth = camera.width / camera.zoom
  const visibleHeight = camera.height / camera.zoom
  return {
    x: Math.max(0, Math.min(Math.max(0, worldWidth - visibleWidth), scrollX)),
    y: Math.max(0, Math.min(Math.max(0, worldHeight - visibleHeight), scrollY)),
  }
}

export function projectWorldPoint(
  point: { x: number; y: number },
  camera: Pick<CameraLike, 'scrollX' | 'scrollY' | 'zoom'>,
) {
  return {
    x: (point.x - camera.scrollX) * camera.zoom,
    y: (point.y - camera.scrollY) * camera.zoom,
  }
}
