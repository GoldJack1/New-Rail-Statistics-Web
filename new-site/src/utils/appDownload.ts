/** App Store / Play Store targets for the Download App CTA. */
export const IOS_APP_URL = 'https://apps.apple.com/gb/app/rail-statistics/id6759503043'
export const ANDROID_APP_URL =
  'https://play.google.com/store/apps/details?id=com.jw.railstatisticsandroid.beta&pli=1'

export type AppDownloadPlatform = 'ios' | 'android' | 'desktop'

export function detectAppDownloadPlatform(): AppDownloadPlatform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export type AppDownloadAction =
  | { type: 'redirect'; url: string }
  | { type: 'choose-platform' }

/** iOS/Android → store URL; desktop → open platform chooser. */
export function resolveAppDownloadAction(): AppDownloadAction {
  const platform = detectAppDownloadPlatform()
  if (platform === 'ios') return { type: 'redirect', url: IOS_APP_URL }
  if (platform === 'android') return { type: 'redirect', url: ANDROID_APP_URL }
  return { type: 'choose-platform' }
}
