import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { getArticle, getSiteSettings } from '@/lib/content'
import { isLocale, locales, type Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

const labels: Record<Locale, { back: string; titleSuffix: string }> = {
  de: {
    back: 'Zurück zu Informationen',
    titleSuffix: 'East Asia Power Construction Co., Ltd.',
  },
  en: {
    back: 'Back to information',
    titleSuffix: 'East Asia Power Construction Co., Ltd.',
  },
  zh: {
    back: '返回资料',
    titleSuffix: '东亚电力建设有限公司',
  },
}

export function generateStaticParams() {
  return locales.flatMap((locale) => [
    { locale, slug: 'company-registration-profile' },
    { locale, slug: 'public-project-records' },
    { locale, slug: 'qualification-and-renewable-technology' },
  ])
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params
  const locale = isLocale(rawLocale) ? rawLocale : 'en'
  const article = await getArticle(locale, slug)

  return {
    description: article?.excerpt,
    title: article ? `${article.title} | ${labels[locale].titleSuffix}` : labels[locale].titleSuffix,
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: rawLocale, slug } = await params

  if (!isLocale(rawLocale)) {
    notFound()
  }

  const locale = rawLocale
  const [settings, article] = await Promise.all([getSiteSettings(locale), getArticle(locale, slug)])

  if (!article) {
    notFound()
  }

  return (
    <>
      <SiteHeader currentPath={`/${locale}/news/${slug}`} locale={locale} settings={settings} />
      <main className="article-page">
        <article className="article-detail">
          <Link className="article-back" href={`/${locale}/news`}>
            ← {labels[locale].back}
          </Link>
          <div className="article-meta">
            <span>{article.category}</span>
            <time dateTime={article.publishedAt}>
              {new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
                new Date(article.publishedAt),
              )}
            </time>
          </div>
          <h1>{article.title}</h1>
          <p className="article-excerpt">{article.excerpt}</p>
          <div className="article-body">
            {article.body.split('\n').map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </article>
      </main>
      <SiteFooter locale={locale} settings={settings} />
    </>
  )
}
