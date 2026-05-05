import 'dotenv/config'

import { getPayload } from 'payload'

import { fallbackArticles, fallbackHome, fallbackSettings } from '@/content/fallback'
import type { Article, HomeContent, SiteSettings } from '@/content/types'
import { defaultLocale, locales, type Locale } from '@/i18n/config'
import config from '@/payload.config'

type PageSeedData = Omit<HomeContent, 'locale'> & {
  slug: string
  title: string
}

function pageData(locale: Locale): PageSeedData {
  const content = fallbackHome[locale]

  return {
    cta: content.cta,
    deploymentHighlights: content.deploymentHighlights,
    gridSceneSteps: content.gridSceneSteps,
    hero: content.hero,
    proofPoints: content.proofPoints,
    slug: 'home',
    statement: content.statement,
    storyItems: content.storyItems,
    title:
      locale === 'zh'
        ? '首页'
        : locale === 'de'
          ? 'Startseite'
          : 'Home',
  }
}

function articleData(article: Article) {
  return {
    body: article.body,
    category: article.category,
    excerpt: article.excerpt,
    publishedAt: article.publishedAt,
    slug: article.slug,
    title: article.title,
  }
}

async function seedSettings(payload: Awaited<ReturnType<typeof getPayload>>) {
  for (const locale of locales) {
    await payload.updateGlobal({
      data: fallbackSettings[locale] as SiteSettings,
      locale,
      slug: 'site-settings',
    })
  }
}

async function seedHomePage(payload: Awaited<ReturnType<typeof getPayload>>) {
  const existing = await payload.find({
    collection: 'pages',
    limit: 1,
    where: {
      slug: {
        equals: 'home',
      },
    },
  })

  const englishData = pageData(defaultLocale)
  const page =
    existing.docs[0] ??
    (await payload.create({
      collection: 'pages',
      data: englishData,
      locale: defaultLocale,
    }))

  for (const locale of locales) {
    await payload.update({
      collection: 'pages',
      data: pageData(locale),
      id: page.id,
      locale,
    })
  }
}

async function seedArticles(payload: Awaited<ReturnType<typeof getPayload>>) {
  for (const englishArticle of fallbackArticles.en) {
    const existing = await payload.find({
      collection: 'articles',
      limit: 1,
      where: {
        slug: {
          equals: englishArticle.slug,
        },
      },
    })

    const article =
      existing.docs[0] ??
      (await payload.create({
        collection: 'articles',
        data: articleData(englishArticle),
        locale: defaultLocale,
      }))

    for (const locale of locales) {
      const localizedArticle = fallbackArticles[locale].find(
        (candidate) => candidate.slug === englishArticle.slug,
      )

      if (localizedArticle) {
        await payload.update({
          collection: 'articles',
          data: articleData(localizedArticle),
          id: article.id,
          locale,
        })
      }
    }
  }
}

async function seedAdmin(payload: Awaited<ReturnType<typeof getPayload>>) {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@eastasiapower.example'
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!'
  const existing = await payload.find({
    collection: 'users',
    limit: 1,
    where: {
      email: {
        equals: email,
      },
    },
  })

  if (existing.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: {
        email,
        password,
      },
    })
  }
}

async function run() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  await seedAdmin(payload)
  await seedSettings(payload)
  await seedHomePage(payload)
  await seedArticles(payload)

  payload.logger.info('Seeded East Asia Power content.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
