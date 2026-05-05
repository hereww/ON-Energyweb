import { cache } from 'react'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { fallbackArticles, fallbackHome, fallbackSettings } from '@/content/fallback'
import type { Article, HomeContent, SiteSettings } from '@/content/types'
import type { Locale } from '@/i18n/config'

type CMSHomePage = Partial<Omit<HomeContent, 'locale'>> & {
  seo?: {
    description?: string
    title?: string
  }
}

type CMSArticle = {
  body?: string
  category?: Article['category']
  excerpt?: string
  publishedAt?: string
  slug?: string
  title?: string
}

type CMSSiteSettings = Partial<SiteSettings>

const getPayloadClient = cache(async () => {
  const payloadConfig = await config
  return getPayload({ config: payloadConfig })
})

function isFilled(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function withFallback(value: unknown, fallback: string): string {
  return isFilled(value) ? value : fallback
}

function mergeProofPoints(
  fallbackItems: HomeContent['proofPoints'],
  cmsItems: HomeContent['proofPoints'] | undefined,
): HomeContent['proofPoints'] {
  if (!cmsItems || cmsItems.length === 0) {
    return fallbackItems
  }

  const merged = cmsItems
    .map((item, index) => {
      const fallback = fallbackItems[index]

      return {
        label: withFallback(item.label, fallback?.label ?? ''),
        value: withFallback(item.value, fallback?.value ?? ''),
      }
    })
    .filter((item) => isFilled(item.label) && isFilled(item.value))

  return merged.length > 0 ? merged : fallbackItems
}

function mergeStoryItems(
  fallbackItems: HomeContent['storyItems'],
  cmsItems: HomeContent['storyItems'] | undefined,
): HomeContent['storyItems'] {
  if (!cmsItems || cmsItems.length === 0) {
    return fallbackItems
  }

  const merged = cmsItems
    .map((item, index) => {
      const fallback = fallbackItems[index]

      return {
        body: withFallback(item.body, fallback?.body ?? ''),
        kind: item.kind ?? fallback?.kind ?? 'challenge',
        metricLabel: withFallback(item.metricLabel, fallback?.metricLabel ?? ''),
        metricUnit: isFilled(item.metricUnit) ? item.metricUnit : fallback?.metricUnit,
        metricValue: withFallback(item.metricValue, fallback?.metricValue ?? ''),
        number: item.number ?? fallback?.number ?? index + 1,
        title: withFallback(item.title, fallback?.title ?? ''),
      }
    })
    .filter((item) => isFilled(item.title) && isFilled(item.body) && isFilled(item.metricLabel))

  return merged.length > 0 ? merged : fallbackItems
}

function mergeLinks(
  fallbackItems: SiteSettings['navigation'],
  cmsItems: SiteSettings['navigation'] | undefined,
): SiteSettings['navigation'] {
  if (!cmsItems || cmsItems.length === 0) {
    return fallbackItems
  }

  const merged = cmsItems
    .map((item, index) => {
      const fallback =
        fallbackItems.find((fallbackItem) => fallbackItem.href === item.href) ?? fallbackItems[index]

      return {
        href: withFallback(item.href, fallback?.href ?? '#'),
        label: withFallback(item.label, fallback?.label ?? ''),
      }
    })
    .filter((item) => isFilled(item.href) && isFilled(item.label))

  return merged.length > 0 ? merged : fallbackItems
}

function mergeHomeContent(fallback: HomeContent, page: CMSHomePage | undefined): HomeContent {
  if (!page) {
    return fallback
  }

  return {
    cta: {
      body: withFallback(page.cta?.body, fallback.cta.body),
      headline: withFallback(page.cta?.headline, fallback.cta.headline),
      href: withFallback(page.cta?.href, fallback.cta.href),
      label: withFallback(page.cta?.label, fallback.cta.label),
    },
    deploymentHighlights: mergeProofPoints(fallback.deploymentHighlights, page.deploymentHighlights),
    hero: {
      headline: withFallback(page.hero?.headline, fallback.hero.headline),
      primaryCtaLabel: withFallback(page.hero?.primaryCtaLabel, fallback.hero.primaryCtaLabel),
      secondaryCtaLabel: withFallback(page.hero?.secondaryCtaLabel, fallback.hero.secondaryCtaLabel ?? ''),
      subline: withFallback(page.hero?.subline, fallback.hero.subline),
    },
    locale: fallback.locale,
    proofPoints: mergeProofPoints(fallback.proofPoints, page.proofPoints),
    statement: {
      headline: withFallback(page.statement?.headline, fallback.statement.headline),
      lead: withFallback(page.statement?.lead, fallback.statement.lead),
    },
    storyItems: mergeStoryItems(fallback.storyItems, page.storyItems),
  }
}

function normalizeArticle(article: CMSArticle): Article | undefined {
  if (!article.slug || !article.title || !article.excerpt || !article.body || !article.publishedAt) {
    return undefined
  }

  return {
    body: article.body,
    category: article.category ?? 'market',
    excerpt: article.excerpt,
    publishedAt: article.publishedAt,
    slug: article.slug,
    title: article.title,
  }
}

function isArticle(article: Article | undefined): article is Article {
  return Boolean(article)
}

export async function getHomeContent(locale: Locale): Promise<HomeContent> {
  const fallback = fallbackHome[locale]

  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'pages',
      depth: 1,
      fallbackLocale: 'en',
      limit: 1,
      locale,
      where: {
        slug: {
          equals: 'home',
        },
      },
    })

    return mergeHomeContent(fallback, result.docs[0] as CMSHomePage | undefined)
  } catch (_ignore) {
    return fallback
  }
}

export async function getSiteSettings(locale: Locale): Promise<SiteSettings> {
  const fallback = fallbackSettings[locale]

  try {
    const payload = await getPayloadClient()
    const settings = (await payload.findGlobal({
      fallbackLocale: 'en',
      locale,
      slug: 'site-settings',
    })) as CMSSiteSettings

    return {
      companyName: withFallback(settings.companyName, fallback.companyName),
      contact: {
        address: withFallback(settings.contact?.address, fallback.contact.address ?? ''),
        email: withFallback(settings.contact?.email, fallback.contact.email),
        phone: withFallback(settings.contact?.phone, fallback.contact.phone ?? ''),
      },
      footerLinks: mergeLinks(fallback.footerLinks, settings.footerLinks),
      navigation: mergeLinks(fallback.navigation, settings.navigation),
      seo: {
        description: withFallback(settings.seo?.description, fallback.seo.description),
        title: withFallback(settings.seo?.title, fallback.seo.title),
      },
      tagline: withFallback(settings.tagline, fallback.tagline),
    }
  } catch (_ignore) {
    return fallback
  }
}

export async function getArticles(locale: Locale): Promise<Article[]> {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'articles',
      depth: 1,
      fallbackLocale: 'en',
      limit: 12,
      locale,
      sort: '-publishedAt',
    })
    const articles = result.docs.map((doc) => normalizeArticle(doc as CMSArticle)).filter(isArticle)

    return articles.length > 0 ? articles : fallbackArticles[locale]
  } catch (_ignore) {
    return fallbackArticles[locale]
  }
}

export async function getArticle(locale: Locale, slug: string): Promise<Article | undefined> {
  const fallback = fallbackArticles[locale].find((article) => article.slug === slug)

  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'articles',
      depth: 1,
      fallbackLocale: 'en',
      limit: 1,
      locale,
      where: {
        slug: {
          equals: slug,
        },
      },
    })
    const article = normalizeArticle(result.docs[0] as CMSArticle)

    return article ?? fallback
  } catch (_ignore) {
    return fallback
  }
}
