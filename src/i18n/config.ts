export const locales = ['en', 'zh', 'de'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeLabels: Record<Locale, string> = {
  de: 'DE',
  en: 'EN',
  zh: '中文',
}

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale)
}

export function getPreferredLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) {
    return defaultLocale
  }

  const normalized = acceptLanguage.toLowerCase()

  if (normalized.includes('zh')) {
    return 'zh'
  }

  if (normalized.includes('de')) {
    return 'de'
  }

  return defaultLocale
}

export function localizePath(path: string, locale: Locale): string {
  const segments = path.split('/').filter(Boolean)

  if (segments.length > 0 && isLocale(segments[0])) {
    segments[0] = locale
    return `/${segments.join('/')}`
  }

  return `/${locale}${path === '/' ? '' : path}`
}
