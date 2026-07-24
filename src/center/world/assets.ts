import surfaceWorldMapUrl from '../../assets/center/surface/surface-world-map-v2.png'

export const ASSETS = {
  surfaceMap: 'map.surface.default',
  innerMap: 'map.inner.default',
  paperTexture: 'ui.paper.default',
} as const

const ASSET_URLS: Record<string, string> = {
  [ASSETS.surfaceMap]: surfaceWorldMapUrl,
}

export function resolveCenterAsset(assetKey: string) {
  return ASSET_URLS[assetKey] ?? null
}
