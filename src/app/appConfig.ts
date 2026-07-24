export const appConfig = {
  contentApiBaseUrl: import.meta.env.VITE_CONTENT_API_BASE_URL ?? '',
  assetBaseUrl: import.meta.env.VITE_ASSET_BASE_URL ?? '',
  defaultStoryPackageUrl: '/sample-content/ghost-market.newtone.zip',
} as const
